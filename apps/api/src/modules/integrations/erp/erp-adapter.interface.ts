import type { Prisma } from '@prisma/client';

export type ErpSyncInput = {
  organizationId?: string;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.InputJsonObject;
  idempotencyKey?: string;
};

export type ErpSyncResult = {
  externalReference: string;
  status: 'SYNCED_MOCK' | 'SYNCED';
  syncedAt: string;
};

export interface ErpAdapter {
  sync(input: ErpSyncInput): Promise<ErpSyncResult>;
}
