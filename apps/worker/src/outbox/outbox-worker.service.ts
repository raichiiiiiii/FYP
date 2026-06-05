import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { OutboxEvent, Prisma } from '@prisma/client';
import { readWorkerEnv } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { MockIntegrationAdapters } from '../integrations/mock-adapters';

@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private readonly env = readWorkerEnv();
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: MockIntegrationAdapters,
  ) {}

  async onModuleInit() {
    if (!this.env.enabled) {
      this.logger.log('Outbox polling disabled');
      return;
    }

    await this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.env.pollIntervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async runOnce() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      let event = await this.claimNext();

      while (event) {
        await this.processEvent(event);
        event = await this.claimNext();
      }
    } finally {
      this.processing = false;
    }
  }

  private claimNext() {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.outboxEvent.findFirst({
        where: {
          status: 'PENDING',
          nextRunAt: {
            lte: new Date(),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!event) {
        return null;
      }

      return tx.outboxEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: 'PROCESSING',
          attempts: {
            increment: 1,
          },
          lastError: null,
        },
      });
    });
  }

  private async processEvent(event: OutboxEvent) {
    try {
      const payload = this.asObject(event.payload);
      const result = this.adapters.dispatch(event.eventType, payload);
      await this.storeExternalReference(event, result);
      await this.prisma.outboxEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      await this.retry(event, error);
    }
  }

  private async storeExternalReference(
    event: OutboxEvent,
    result: {
      integrationType: string;
      externalReference: string;
      status: string;
      responsePayload: Prisma.InputJsonObject;
    },
  ) {
    const requestPayload = this.asObject(event.payload);

    await this.prisma.integrationReconciliationRecord.upsert({
      where: {
        outboxEventId: event.id,
      },
      create: {
        organizationId: event.organizationId,
        outboxEventId: event.id,
        integrationType: result.integrationType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        externalReference: result.externalReference,
        status: result.status,
        requestPayload,
        responsePayload: result.responsePayload,
        attempts: event.attempts,
      },
      update: {
        externalReference: result.externalReference,
        status: result.status,
        responsePayload: result.responsePayload,
        attempts: event.attempts,
        lastError: null,
      },
    });

    if (event.eventType === 'FABRIC_ANCHOR_REQUESTED') {
      await this.storeFabricAnchor(event, result.responsePayload);
    }

    if (event.eventType === 'WEBHOOK_DELIVERY_REQUESTED') {
      await this.storeWebhookDelivery(event, result.responsePayload);
    }
  }

  private async storeFabricAnchor(
    event: OutboxEvent,
    payload: Prisma.InputJsonObject,
  ) {
    const status = this.stringValue(payload.status, 'ANCHORED_MOCK');
    const isMock = status === 'ANCHORED_MOCK';
    const anchoredAt = ['ANCHORED_MOCK', 'ANCHORED', 'VERIFIED'].includes(
      status,
    )
      ? new Date()
      : null;

    await this.prisma.auditAnchor.create({
      data: {
        organizationId: event.organizationId,
        anchorType: isMock ? 'FABRIC_MOCK' : 'FABRIC',
        status,
        rootHash: this.stringValue(payload.canonicalHash, 'mock'),
        metadata: payload,
        anchoredAt,
        fabricTransactionId: this.nullableStringValue(
          payload.fabricTransactionId,
        ),
        fabricBlockNumber: this.numberValue(payload.fabricBlockNumber),
        fabricChannel: this.nullableStringValue(payload.fabricChannel),
        fabricChaincode: this.nullableStringValue(payload.fabricChaincode),
        fabricCommitStatus: this.nullableStringValue(
          payload.fabricCommitStatus,
        ),
        fabricEndorsementStatus: this.nullableStringValue(
          payload.fabricEndorsementStatus,
        ),
        fabricVerifiedAt: status === 'VERIFIED' ? new Date() : null,
      },
    });
  }

  private async storeWebhookDelivery(
    event: OutboxEvent,
    payload: Prisma.InputJsonObject,
  ) {
    const requestPayload = this.asObject(event.payload);

    await this.prisma.webhookDelivery.create({
      data: {
        organizationId: event.organizationId,
        outboxEventId: event.id,
        eventType: this.stringValue(requestPayload.eventType, event.eventType),
        targetUrl: this.stringValue(
          requestPayload.targetUrl,
          'mock://subscription',
        ),
        payload: requestPayload,
        status: this.stringValue(payload.status, 'DELIVERED_MOCK'),
        attempts: event.attempts,
        deliveredAt: new Date(),
      },
    });
  }

  private async retry(event: OutboxEvent, error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown worker error';

    if (event.attempts >= this.env.maxAttempts) {
      await this.prisma.outboxEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: 'FAILED',
          lastError: message,
        },
      });
      return;
    }

    const retryDelayMs = Math.min(300_000, 10_000 * 2 ** event.attempts);
    await this.prisma.outboxEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: 'PENDING',
        lastError: message,
        nextRunAt: new Date(Date.now() + retryDelayMs),
      },
    });
  }

  private asObject(payload: Prisma.JsonValue): Prisma.InputJsonObject {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload;
    }

    return {};
  }

  private stringValue(value: unknown, fallback: string) {
    return typeof value === 'string' && value.length ? value : fallback;
  }

  private nullableStringValue(value: unknown) {
    return typeof value === 'string' && value.length ? value : null;
  }

  private numberValue(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
