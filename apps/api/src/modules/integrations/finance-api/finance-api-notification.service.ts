import { Injectable } from '@nestjs/common';
import type { FinanceApiNotificationInput } from './finance-api-adapter.interface';
import { OutboxService } from '../../outbox/outbox.service';
import { IntegrationRequestAuditService } from '../integration-request-audit.service';

@Injectable()
export class FinanceApiNotificationService {
  constructor(
    private readonly outbox: OutboxService,
    private readonly integrationAudit: IntegrationRequestAuditService,
  ) {}

  async requestNotification(input: FinanceApiNotificationInput) {
    const payload = {
      integrationType: 'FINANCE_API',
      notificationType: input.notificationType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
    };

    const event = await this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'FINANCE_API_NOTIFICATION_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: `finance-api:${input.organizationId || 'global'}:${input.notificationType}:${input.aggregateType}:${input.aggregateId}`,
      payload,
    });

    await this.integrationAudit.recordRequested({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'FINANCE_API_NOTIFICATION_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      outboxEventId: event.id,
      payload,
    });

    return event;
  }
}
