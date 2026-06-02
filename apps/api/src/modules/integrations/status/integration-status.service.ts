import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  IntegrationReconciliationRecord,
  OutboxEvent,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

type OutboxWithReconciliation = OutboxEvent & {
  reconciliationRecord: IntegrationReconciliationRecord | null;
};

@Injectable()
export class IntegrationStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async listOutbox(organizationId?: string) {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        organizationId,
      },
      include: {
        reconciliationRecord: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return events.map(formatOutboxEvent);
  }

  async getOutboxEvent(id: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: {
        id,
      },
      include: {
        reconciliationRecord: true,
        webhookDeliveries: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Outbox event not found');
    }

    return {
      ...formatOutboxEvent(event),
      webhookDeliveries: event.webhookDeliveries,
    };
  }

  listReconciliation(organizationId?: string) {
    return this.prisma.integrationReconciliationRecord.findMany({
      where: {
        organizationId,
      },
      include: {
        outboxEvent: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }
}

function formatOutboxEvent(event: OutboxWithReconciliation) {
  return {
    id: event.id,
    organizationId: event.organizationId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    status: event.status,
    displayStatus: displayStatus(event),
    attempts: event.attempts,
    nextRunAt: event.nextRunAt,
    availableAt: event.availableAt,
    lastError: event.lastError,
    idempotencyKey: event.idempotencyKey,
    processedAt: event.processedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    reconciliationRecord: event.reconciliationRecord,
  };
}

function displayStatus(event: OutboxEvent) {
  if (event.status === 'PENDING' && event.attempts > 0 && event.lastError) {
    return 'RETRYING';
  }

  return event.status;
}
