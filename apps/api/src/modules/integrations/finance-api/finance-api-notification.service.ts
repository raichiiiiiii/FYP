import { Injectable } from '@nestjs/common';
import type { FinanceApiNotificationInput } from './finance-api-adapter.interface';
import { OutboxService } from '../../outbox/outbox.service';

@Injectable()
export class FinanceApiNotificationService {
  constructor(private readonly outbox: OutboxService) {}

  requestNotification(input: FinanceApiNotificationInput) {
    return this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'FINANCE_API_NOTIFICATION_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: `finance-api:${input.organizationId || 'global'}:${input.notificationType}:${input.aggregateType}:${input.aggregateId}`,
      payload: {
        integrationType: 'FINANCE_API',
        notificationType: input.notificationType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: input.payload,
      },
    });
  }
}
