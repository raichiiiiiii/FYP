import type {
  AuditAnchor,
  HashRecord,
  IntegrationReconciliationRecord,
  OutboxEvent,
} from '@prisma/client';
import {
  FabricChaincodeAnchorNotFoundError,
  FabricChaincodeUnavailableError,
} from './fabric-chaincode-query.service';
import { HashRecordsService } from './hash-records.service';

const now = new Date('2026-06-05T00:00:00.000Z');
const canonicalHash =
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

describe('HashRecordsService fabricVerification', () => {
  it('rejects missing actor context', async () => {
    const service = serviceWith({
      anchor: auditAnchor(),
    });

    await expect(service.fabricVerification('hash-1')).rejects.toThrow(
      'Fabric verification requires an active organization actor',
    );
  });

  it('rejects actors without audit read permission', async () => {
    const service = serviceWith({
      anchor: auditAnchor(),
      membership: membership({
        role: {
          code: 'VIEWER',
          permissions: [],
        },
      }),
    });

    await expect(service.fabricVerification('hash-1', actor())).rejects.toThrow(
      'Fabric verification requires audit read permission',
    );
  });

  it('never verifies mock anchors', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC_MOCK',
        status: 'ANCHORED_MOCK',
      }),
    });

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
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

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
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

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      verificationStatus: 'FAILED',
      verified: false,
    });
  });

  it('reports real anchor metadata as unavailable without API chaincode query', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'ANCHORED',
        fabricTransactionId: 'real-tx-1',
        fabricChannel: 'mepn-audit',
        fabricChaincode: 'audit-anchor',
      }),
    });

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      verificationStatus: 'ANCHORED_NOT_FULLY_VERIFIED',
      status: 'unavailable',
      verified: false,
      fabric: {
        chaincodeQueryAvailable: false,
        chaincodeVerificationStatus: 'UNAVAILABLE',
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

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
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

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      verificationStatus: 'FABRIC_UNAVAILABLE',
      verified: false,
      fabric: {
        reconciliation: {
          status: 'FABRIC_UNAVAILABLE',
        },
      },
    });
  });

  it('does not verify stored non-mock metadata without a chaincode read', async () => {
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

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      verificationStatus: 'ANCHORED_NOT_FULLY_VERIFIED',
      status: 'unavailable',
      verified: false,
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

  it('reports verified when ReadAnchor returns the matching hash', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'VERIFIED',
        metadata: {
          anchorId:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      }),
      chaincodeAnchor: {
        anchorId:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
        canonicalHash,
      },
    });

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      status: 'verified',
      verificationStatus: 'VERIFIED',
      verified: true,
      localCanonicalHash: canonicalHash,
      storedAnchorHash: canonicalHash,
      onChainAnchorHash: canonicalHash,
      transactionId: 'real-tx-1',
      channelName: 'mepn-audit',
      chaincodeName: 'audit-anchor',
      fabric: {
        chaincodeQueryAvailable: true,
        chaincodeHashMatch: true,
        chaincodeVerificationStatus: 'VERIFIED',
      },
    });
  });

  it('reports not_found when ReadAnchor cannot find the stored anchor', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'ANCHORED',
      }),
      chaincodeError: new FabricChaincodeAnchorNotFoundError(
        'anchor not found',
      ),
    });

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      status: 'not_found',
      verified: false,
      fabric: {
        chaincodeVerificationStatus: 'NOT_FOUND',
      },
    });
  });

  it('reports mismatch when ReadAnchor returns a different canonical hash', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'VERIFIED',
      }),
      chaincodeAnchor: {
        anchorId:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
        canonicalHash:
          'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      },
    });

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      status: 'mismatch',
      verificationStatus: 'HASH_MISMATCH',
      verified: false,
      onChainAnchorHash:
        'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      fabric: {
        chaincodeHashMatch: false,
        chaincodeVerificationStatus: 'MISMATCH',
      },
    });
  });

  it('reports unavailable when Gateway material or Fabric runtime is unavailable', async () => {
    const service = serviceWith({
      anchor: auditAnchor({
        anchorType: 'FABRIC',
        status: 'VERIFIED',
      }),
      chaincodeError: new FabricChaincodeUnavailableError(
        'Fabric Gateway secret/config material is missing or unreadable',
      ),
    });

    await expect(
      service.fabricVerification('hash-1', actor()),
    ).resolves.toMatchObject({
      status: 'unavailable',
      verified: false,
      mismatchReason:
        'Fabric Gateway secret/config material is missing or unreadable',
      fabric: {
        chaincodeVerificationStatus: 'UNAVAILABLE',
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
  chaincodeAnchor?: {
    anchorId: string;
    entityType: string;
    entityId: string;
    canonicalHash: string;
  };
  chaincodeError?: Error;
  membership?: unknown;
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
  const readAnchor = jest.fn();

  if (input.chaincodeError) {
    readAnchor.mockRejectedValue(input.chaincodeError);
  } else if (input.chaincodeAnchor) {
    readAnchor.mockResolvedValue({
      anchor: input.chaincodeAnchor,
      context: {
        mode: 'fabric-gateway',
        channelName: 'mepn-audit',
        chaincodeName: 'audit-anchor',
        fabricPeerEndpoint: 'peer0.org1.example:7051',
        gatewayUrl: 'grpcs://fabric-gateway.example:7051',
        mspId: 'Org1MSP',
        identity: 'gateway-admin',
      },
    });
  }
  const fabricChaincode =
    input.chaincodeAnchor || input.chaincodeError
      ? {
          readAnchor,
        }
      : undefined;

  return new HashRecordsService(
    {
      hashRecord: {
        findUnique,
      },
      membership: {
        findFirst: jest
          .fn()
          .mockResolvedValue(input.membership ?? membership()),
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
    fabricChaincode as never,
  );
}

function actor() {
  return {
    organizationId: 'org-1',
    actorUserId: 'user-1',
  };
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1',
    organizationId: 'org-1',
    userId: 'user-1',
    status: 'active',
    role: {
      code: 'AUDITOR',
      permissions: [],
    },
    ...overrides,
  };
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
