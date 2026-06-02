import { Injectable } from '@nestjs/common';
import type {
  FinanceApiAdapter,
  FinanceApiNotificationInput,
  FinanceApiNotificationResult,
} from './finance-api-adapter.interface';

@Injectable()
export class MockFinanceApiAdapter implements FinanceApiAdapter {
  async notify(
    input: FinanceApiNotificationInput,
  ): Promise<FinanceApiNotificationResult> {
    await Promise.resolve();

    return {
      externalReference: `mock-finance-api-${input.notificationType}-${input.aggregateId}`,
      status: 'NOTIFIED_MOCK',
      notifiedAt: new Date().toISOString(),
    };
  }
}
