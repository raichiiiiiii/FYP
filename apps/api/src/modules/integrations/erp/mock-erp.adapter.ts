import { Injectable } from '@nestjs/common';
import type {
  ErpAdapter,
  ErpSyncInput,
  ErpSyncResult,
} from './erp-adapter.interface';

@Injectable()
export class MockErpAdapter implements ErpAdapter {
  async sync(input: ErpSyncInput): Promise<ErpSyncResult> {
    await Promise.resolve();

    return {
      externalReference: `mock-erp-${input.aggregateType}-${input.aggregateId}`,
      status: 'SYNCED_MOCK',
      syncedAt: new Date().toISOString(),
    };
  }
}
