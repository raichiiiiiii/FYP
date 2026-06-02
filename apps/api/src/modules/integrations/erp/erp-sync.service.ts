import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { OutboxService } from '../../outbox/outbox.service';

export type RequestErpSyncInput = {
  organizationId?: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Prisma.InputJsonObject;
  idempotencyKey?: string;
};

@Injectable()
export class ErpSyncService {
  constructor(private readonly outbox: OutboxService) {}

  requestSync(input: RequestErpSyncInput) {
    return this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'ERP_SYNC_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey:
        input.idempotencyKey ||
        `erp:${input.organizationId || 'global'}:${input.aggregateType}:${input.aggregateId}`,
      payload: {
        integrationType: 'ERP',
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: input.payload || {},
      },
    });
  }
}
