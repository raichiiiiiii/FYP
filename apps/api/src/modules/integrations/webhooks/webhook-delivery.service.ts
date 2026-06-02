import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { OutboxService } from '../../outbox/outbox.service';
import { IntegrationRequestAuditService } from '../integration-request-audit.service';

export type RequestWebhookDeliveryInput = {
  organizationId?: string;
  actorUserId?: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  targetUrl?: string;
  payload: Prisma.InputJsonObject;
};

@Injectable()
export class WebhookDeliveryService {
  constructor(
    private readonly outbox: OutboxService,
    private readonly integrationAudit: IntegrationRequestAuditService,
  ) {}

  async requestDelivery(input: RequestWebhookDeliveryInput) {
    const payload = {
      integrationType: 'WEBHOOK',
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      targetUrl: input.targetUrl,
      payload: input.payload,
    };

    const event = await this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'WEBHOOK_DELIVERY_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: `webhook:${input.organizationId || 'global'}:${input.eventType}:${input.aggregateType}:${input.aggregateId}:${input.targetUrl || 'subscriptions'}`,
      payload,
    });

    await this.integrationAudit.recordRequested({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'WEBHOOK_DELIVERY_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      outboxEventId: event.id,
      payload,
    });

    return event;
  }
}
