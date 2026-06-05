import { Injectable } from '@nestjs/common';
import type { AdapterResult } from './integration-adapter.types';

@Injectable()
export class MockFabricAnchorAdapter {
  anchor(payload: Record<string, unknown>): AdapterResult {
    const entityType = this.stringValue(
      payload.entityType,
      this.stringValue(payload.aggregateType, 'Aggregate'),
    );
    const entityId = this.stringValue(
      payload.entityId,
      this.stringValue(payload.aggregateId, 'unknown'),
    );
    const canonicalHash = this.stringValue(payload.canonicalHash, '');
    const suffix = canonicalHash.slice(0, 12) || entityId.slice(0, 12);

    return {
      integrationType: 'FABRIC',
      externalReference: `mock-tx-${suffix}`,
      status: 'ANCHORED_MOCK',
      responsePayload: {
        anchorId: `anchor_${entityId}`,
        entityType,
        entityId,
        canonicalHash,
        fabricTransactionId: `mock-tx-${suffix}`,
        fabricBlockNumber: Math.max(
          1,
          Number.parseInt(suffix.slice(0, 6), 16) || 1,
        ),
        status: 'ANCHORED_MOCK',
        anchoredAt: new Date().toISOString(),
      },
    };
  }

  private stringValue(value: unknown, fallback: string) {
    return typeof value === 'string' && value.length ? value : fallback;
  }
}
