import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../outbox/outbox.service';
import type { FabricAnchorInput } from './fabric-anchor.adapter';

@Injectable()
export class FabricAnchorService {
  constructor(private readonly outbox: OutboxService) {}

  requestAnchor(input: FabricAnchorInput) {
    return this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'FABRIC_ANCHOR_REQUESTED',
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `fabric:${input.organizationId || 'global'}:${input.entityType}:${input.entityId}:${input.canonicalHash}`,
      payload: {
        integrationType: 'FABRIC',
        entityType: input.entityType,
        entityId: input.entityId,
        canonicalHash: input.canonicalHash,
        organizationId: input.organizationId,
        timestamp: input.timestamp || new Date().toISOString(),
      },
    });
  }
}
