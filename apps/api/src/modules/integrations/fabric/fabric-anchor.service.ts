import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../outbox/outbox.service';
import { IntegrationRequestAuditService } from '../integration-request-audit.service';
import type { FabricAnchorInput } from './fabric-anchor.adapter';

@Injectable()
export class FabricAnchorService {
  constructor(
    private readonly outbox: OutboxService,
    private readonly integrationAudit: IntegrationRequestAuditService,
  ) {}

  async requestAnchor(input: FabricAnchorInput) {
    const payload = {
      integrationType: 'FABRIC',
      entityType: input.entityType,
      entityId: input.entityId,
      canonicalHash: input.canonicalHash,
      organizationId: input.organizationId,
      timestamp: input.timestamp || new Date().toISOString(),
    };
    const event = await this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'FABRIC_ANCHOR_REQUESTED',
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `fabric:${input.organizationId || 'global'}:${input.entityType}:${input.entityId}:${input.canonicalHash}`,
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
