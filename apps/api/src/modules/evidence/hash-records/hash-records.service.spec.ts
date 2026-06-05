import type {
  AuditAnchor,
  HashRecord,
  IntegrationReconciliationRecord,
  OutboxEvent,
} from '@prisma/client';
import { HashRecordsService } from './hash-records.service';

const now = new Date('2026-06-05T00:00:00.000Z');
const canonicalHash =
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

describe('HashRecordsService fabricVerification', () => {
  it('never verifies mock anchors', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC_MOCK',
        status: 'ANCHORED_MOCK',
      }),
    });

    await expect(service.fabricVerification('hash-1')).resolves.toMatchObject({
      verificationStatus: 'ANCHORED_MOCK',
      verified: false,
      fabric: {
        chaincodeQueryAvailable: false,
      },
    });
  });

  it('reports pending anchor requests from outbox state', async () => {
    const service = serviceWith({
      outboxEvent: outboxEvent({
        status: 'PENDING',
      }),
    });

    await expect(service.fabricVerification('hash-1')).resolves.toMatchObject({
      verificationStatus: 'ANCHOR_REQUESTED',
      verified: false,
      fabric: {
        outboxEvent: {
          status: 'PENDING',
        },
      },
    });
  });

  it('reports failed Fabric anchor state', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'FAILED',
      }),
    });

    await expect(service.fabricVerification('hash-1')).resolves.toMatchObject({
      verificationStatus: 'FAILED',
      verified: false,
    });
  });

  it('reports real anchor metadata as anchored but not fully verified without chaincode query', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'ANCHORED',
        fabricTransactionId: 'real-tx-1',
        fabricChannel: 'mepn-audit',
        fabricChaincode: 'audit-anchor',
      }),
    });

    await expect(service.fabricVerification('hash-1')).resolves.toMatchObject({
      verificationStatus: 'ANCHORED_NOT_FULLY_VERIFIED',
      verified: false,
      fabric: {
        chaincodeQueryAvailable: false,
        chaincodeHashMatch: null,
        anchor: {
          fabricTransactionId: 'real-tx-1',
        },
      },
    });
  });

  it('reports local hash mismatch before trusting anchor metadata', async () => {
    const service = serviceWith({
      recomputedHash:
        'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'VERIFIED',
        fabricTransactionId: 'real-tx-1',
        fabricChannel: 'mepn-audit',
        fabricChaincode: 'audit-anchor',
      }),
    });

    await expect(service.fabricVerification('hash-1')).resolves.toMatchObject({
      verificationStatus: 'HASH_MISMATCH',
      verified: false,
      localHash: {
        match: false,
      },
    });
  });

  it('reports Fabric unavailable from reconciliation state', async () => {
    const service = serviceWith({
      outboxEvent: outboxEvent({
        status: 'PENDING',
        reconciliationRecord: reconciliationRecord({
          status: 'FABRIC_UNAVAILABLE',
          lastError: '14 UNAVAILABLE',
        }),
      }),
    });

    await expect(service.fabricVerification('hash-1')).resolves.toMatchObject({
      verificationStatus: 'FABRIC_UNAVAILABLE',
      verified: false,
      fabric: {
        reconciliation: {
          status: 'FABRIC_UNAVAILABLE',
        },
      },
    });
  });

  it('reports verified when stored non-mock anchor metadata is marked verified', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'VERIFIED',
        fabricTransactionId: 'real-tx-1',
        fabricChannel: 'mepn-audit',
        fabricChaincode: 'audit-anchor',
        fabricVerifiedAt: now,
      }),
    });

    await expect(service.fabricVerification('hash-1')).resolves.toMatchObject({
      verificationStatus: 'VERIFIED',
      verified: true,
      fabric: {
        chaincodeQueryAvailable: false,
        anchor: {
          anchorType: 'FABRIC',
          status: 'VERIFIED',
          fabricTransactionId: 'real-tx-1',
        },
      },
    });
  });
});

function serviceWith(input: {
  record?: HashRecord;
  anchor?: AuditAnchor | null;
  outboxEvent?:
    | (OutboxEvent & {
        reconciliationRecord: IntegrationReconciliationRecord | null;
      })
    | null;
  recomputedHash?: string;
}) {
  const record = input.record ?? hashRecord();
  const findUnique = jest.fn().mockResolvedValue(record);
  const findAnchor = jest.fn().mockResolvedValue(input.anchor ?? null);
  const findOutbox = jest.fn().mockResolvedValue(input.outboxEvent ?? null);
  const hashEntity = jest.fn().mockResolvedValue({
    canonicalHash: input.recomputedHash ?? record.canonicalHash,
    canonicalJson: record.canonicalJson,
    canonicalText: record.canonicalText,
    hashAlgorithm: 'SHA-256',
  });

  return new HashRecordsService(
    {
      hashRecord: {
        findUnique,
      },
      auditAnchor: {
        findFirst: findAnchor,
      },
      outboxEvent: {
        findFirst: findOutbox,
      },
    } as never,
    {} as never,
    {
      hashEntity,
      hashCanonicalJson: jest.fn(),
    } as never,
    {} as never,
  );
}

function hashRecord(overrides: Partial<HashRecord> = {}): HashRecord {
  return {
    id: 'hash-1',
    organizationId: 'org-1',
    entityType: 'PurchaseOrder',
    entityId: 'po-1',
    hashAlgorithm: 'SHA-256',
    canonicalHash,
    canonicalJson: {
      entityType: 'PurchaseOrder',
      entityId: 'po-1',
    },
    canonicalText: '{"entityId":"po-1","entityType":"PurchaseOrder"}',
    createdAt: now,
    verifiedAt: null,
    ...overrides,
  };
}

function auditAnchor(overrides: Partial<AuditAnchor> = {}): AuditAnchor {
  return {
    id: 'anchor-1',
    organizationId: 'org-1',
    anchorType: 'FABRIC',
    status: 'ANCHORED',
    fromAuditEventId: null,
    toAuditEventId: null,
    rootHash: canonicalHash,
    metadata: {},
    anchoredAt: now,
    fabricTransactionId: 'real-tx-1',
    fabricBlockNumber: 12,
    fabricChannel: 'mepn-audit',
    fabricChaincode: 'audit-anchor',
    fabricCommitStatus: 'VALID',
    fabricEndorsementStatus: null,
    fabricVerifiedAt: null,
    createdAt: now,
    ...overrides,
  };
}

function outboxEvent(
  overrides: Partial<
    OutboxEvent & {
      reconciliationRecord: IntegrationReconciliationRecord | null;
    }
  > = {},
): OutboxEvent & {
  reconciliationRecord: IntegrationReconciliationRecord | null;
} {
  return {
    id: 'outbox-1',
    organizationId: 'org-1',
    eventType: 'FABRIC_ANCHOR_REQUESTED',
    aggregateType: 'PurchaseOrder',
    aggregateId: 'po-1',
    payload: {},
    status: 'PENDING',
    attempts: 0,
    nextRunAt: now,
    availableAt: null,
    lastError: null,
    idempotencyKey: `fabric:org-1:PurchaseOrder:po-1:${canonicalHash}`,
    processedAt: null,
    createdAt: now,
    updatedAt: now,
    reconciliationRecord: null,
    ...overrides,
  };
}

function reconciliationRecord(
  overrides: Partial<IntegrationReconciliationRecord> = {},
): IntegrationReconciliationRecord {
  return {
    id: 'recon-1',
    organizationId: 'org-1',
    outboxEventId: 'outbox-1',
    integrationType: 'FABRIC',
    aggregateType: 'PurchaseOrder',
    aggregateId: 'po-1',
    externalReference: null,
    status: 'PENDING',
    requestPayload: {},
    responsePayload: null,
    lastError: null,
    attempts: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
