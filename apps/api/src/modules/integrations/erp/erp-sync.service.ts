import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { OutboxService } from '../../outbox/outbox.service';
import { IntegrationRequestAuditService } from '../integration-request-audit.service';

export type RequestErpSyncInput = {
  organizationId?: string;
  actorUserId?: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Prisma.InputJsonObject;
  idempotencyKey?: string;
};

@Injectable()
export class ErpSyncService {
  constructor(
    private readonly outbox: OutboxService,
    private readonly integrationAudit: IntegrationRequestAuditService,
  ) {}

  async requestSync(input: RequestErpSyncInput) {
    const payload = {
      integrationType: 'ERP',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload || {},
    };
    const event = await this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'ERP_SYNC_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey:
        input.idempotencyKey ||
        `erp:${input.organizationId || 'global'}:${input.aggregateType}:${input.aggregateId}`,
      payload,
    });
    await this.integrationAudit.recordRequested({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      outboxEventId: event.id,
      payload,
    });

    return event;
  }
}
