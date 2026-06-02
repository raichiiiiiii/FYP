import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type CreateOutboxEventInput = {
  organizationId?: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.InputJsonObject;
  nextRunAt?: Date;
  idempotencyKey?: string;
};

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOutboxEventInput) {
    const data = {
      organizationId: input.organizationId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      nextRunAt: input.nextRunAt,
      idempotencyKey: input.idempotencyKey,
    } satisfies Prisma.OutboxEventUncheckedCreateInput;

    if (input.idempotencyKey) {
      const existing = await this.prisma.outboxEvent.findUnique({
        where: {
          idempotencyKey: input.idempotencyKey,
        },
      });

      if (existing) {
        throw new ConflictException('Outbox idempotency key already exists');
      }
    }

    return this.prisma.outboxEvent.create({ data });
  }

  requestIntegration(input: CreateOutboxEventInput) {
    return this.create(input);
  }

  claimNext() {
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

  markCompleted(id: string) {
    return this.prisma.outboxEvent.update({
      where: {
        id,
      },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  markFailed(id: string, error: string, retryDelayMs = 60_000) {
    return this.prisma.outboxEvent.update({
      where: {
        id,
      },
      data: {
        status: 'PENDING',
        lastError: error,
        nextRunAt: new Date(Date.now() + retryDelayMs),
      },
    });
  }

  markDeadLetter(id: string, error: string) {
    return this.prisma.outboxEvent.update({
      where: {
        id,
      },
      data: {
        status: 'FAILED',
        lastError: error,
      },
    });
  }

  createReconciliationRecord(input: {
    organizationId?: string | null;
    outboxEventId: string;
    integrationType: string;
    aggregateType: string;
    aggregateId: string;
    externalReference?: string;
    status: string;
    requestPayload: Prisma.InputJsonObject;
    responsePayload?: Prisma.InputJsonObject;
    lastError?: string;
    attempts: number;
  }) {
    return this.prisma.integrationReconciliationRecord.upsert({
      where: {
        outboxEventId: input.outboxEventId,
      },
      create: {
        organizationId: input.organizationId,
        outboxEventId: input.outboxEventId,
        integrationType: input.integrationType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        externalReference: input.externalReference,
        status: input.status,
        requestPayload: input.requestPayload,
        responsePayload: input.responsePayload,
        lastError: input.lastError,
        attempts: input.attempts,
      },
      update: {
        externalReference: input.externalReference,
        status: input.status,
        responsePayload: input.responsePayload,
        lastError: input.lastError,
        attempts: input.attempts,
      },
    });
  }

  listPending(take = 50) {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        nextRunAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take,
    });
  }
}
