import type { Prisma } from '@prisma/client';

export type FinanceApiNotificationInput = {
  organizationId?: string;
  actorUserId?: string;
  aggregateType: string;
  aggregateId: string;
  notificationType: string;
  payload: Prisma.InputJsonObject;
};

export type FinanceApiNotificationResult = {
  externalReference: string;
  status: 'NOTIFIED_MOCK' | 'NOTIFIED';
  notifiedAt: string;
};

export interface FinanceApiAdapter {
  notify(
    input: FinanceApiNotificationInput,
  ): Promise<FinanceApiNotificationResult>;
}
