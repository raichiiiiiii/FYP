import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export type AdapterResult = {
  integrationType: string;
  externalReference: string;
  status: string;
  responsePayload: Prisma.InputJsonObject;
};

@Injectable()
export class MockIntegrationAdapters {
  dispatch(eventType: string, payload: Record<string, unknown>) {
    if (eventType === 'FABRIC_ANCHOR_REQUESTED') {
      return this.anchorFabric(payload);
    }

    if (eventType === 'ERP_SYNC_REQUESTED') {
      return this.mockResult('ERP', 'SYNCED_MOCK', payload);
    }

    if (eventType === 'ESIGNATURE_PACKAGE_REQUESTED') {
      return this.mockResult('ESIGN', 'PACKAGE_CREATED_MOCK', payload);
    }

    if (eventType === 'FINANCE_API_NOTIFICATION_REQUESTED') {
      return this.mockResult('FINANCE_API', 'NOTIFIED_MOCK', payload);
    }

    if (eventType === 'WEBHOOK_DELIVERY_REQUESTED') {
      return this.mockResult('WEBHOOK', 'DELIVERED_MOCK', payload);
    }

    if (eventType === 'EVIDENCE_PACK_EXPORT_REQUESTED') {
      return this.mockResult('EVIDENCE_EXPORT', 'EXPORTED_MOCK', payload);
    }

    return this.mockResult('INTERNAL', 'ACKNOWLEDGED', payload);
  }

  private anchorFabric(payload: Record<string, unknown>): AdapterResult {
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

  private mockResult(
    integrationType: string,
    status: string,
    payload: Record<string, unknown>,
  ): AdapterResult {
    const aggregateType = this.stringValue(payload.aggregateType, 'Aggregate');
    const aggregateId = this.stringValue(
      payload.aggregateId,
      this.stringValue(payload.entityId, 'unknown'),
    );

    return {
      integrationType,
      externalReference: `mock-${integrationType.toLowerCase()}-${aggregateType}-${aggregateId}`,
      status,
      responsePayload: {
        aggregateType,
        aggregateId,
        status,
        completedAt: new Date().toISOString(),
      },
    };
  }

  private stringValue(value: unknown, fallback: string) {
    return typeof value === 'string' && value.length ? value : fallback;
  }
}
