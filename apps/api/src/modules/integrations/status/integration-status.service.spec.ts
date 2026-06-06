import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { IntegrationStatusService } from './integration-status.service';

const gatewayEnv = {
  FABRIC_ENABLED: 'true',
  FABRIC_MODE: 'gateway',
  FABRIC_GATEWAY_URL: 'grpcs://fabric-gateway.example:7051',
  FABRIC_MSP_ID: 'Org1MSP',
  FABRIC_CHANNEL: 'mepn-audit',
  FABRIC_CHAINCODE: 'audit-anchor',
  FABRIC_IDENTITY_CERT_PATH: '/run/secrets/fabric/client.crt',
  FABRIC_PRIVATE_KEY_PATH: '/run/secrets/fabric/client.key',
  FABRIC_TLS_CERT_PATH: '/run/secrets/fabric/ca.crt',
  FABRIC_PEER_ENDPOINT: 'peer0.org1.example:7051',
  FABRIC_GATEWAY_HOST_ALIAS: 'peer0.org1.example',
};

describe('IntegrationStatusService Fabric status', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports explicit mock mode without requiring gateway credentials', async () => {
    process.env.FABRIC_ENABLED = 'true';
    process.env.FABRIC_MODE = 'mock';
    process.env.BLOCKCHAIN_ANCHOR_ADAPTER = 'mock';

    const service = new IntegrationStatusService({} as never);

    await expect(service.getFabricStatus()).resolves.toMatchObject({
      enabled: true,
      mode: 'mock',
      gatewayConfigured: false,
      gatewayMaterialReady: false,
      realGatewayAdapterImplemented: true,
      anchorResultSource: 'mock-adapter',
      missingGatewayConfig: [],
      secretMaterial: {
        required: false,
        allPresent: false,
      },
      message:
        'Fabric anchoring is explicitly running in mock mode. Local workflows can continue, but mock anchors are not on-chain proof.',
    });
  });

  it('reports configured gateway mode without exposing secret paths or endpoint values', async () => {
    process.env = {
      ...process.env,
      ...gatewayEnv,
    };

    const service = new IntegrationStatusService({} as never);

    await expect(service.getFabricStatus()).resolves.toMatchObject({
      enabled: true,
      mode: 'gateway',
      gatewayConfigured: true,
      gatewayMaterialReady: false,
      realGatewayAdapterImplemented: true,
      anchorResultSource: 'worker-gateway-adapter',
      missingGatewayConfig: [],
      secretMaterial: {
        required: true,
        allPresent: false,
      },
      configuredChannel: 'configured',
      configuredChaincode: 'configured',
      configuredMspId: 'configured',
    });
    await expect(service.getFabricStatus()).resolves.toMatchObject({
      latestRealAnchor: {
        present: false,
        status: 'none',
      },
    });
    expect(JSON.stringify(await service.getFabricStatus())).not.toContain(
      gatewayEnv.FABRIC_GATEWAY_URL,
    );
  });

  it('reports mounted gateway material and latest real anchor evidence safely', async () => {
    const secretRoot = mkFabricSecretRoot();
    process.env = {
      ...process.env,
      ...gatewayEnv,
      FABRIC_IDENTITY_CERT_PATH: join(secretRoot, 'identity', 'cert.pem'),
      FABRIC_PRIVATE_KEY_PATH: join(secretRoot, 'identity', 'key.pem'),
      FABRIC_TLS_CERT_PATH: join(secretRoot, 'tls', 'ca.crt'),
    };

    const service = new IntegrationStatusService({
      auditAnchor: {
        findFirst: jest.fn().mockResolvedValue(
          auditAnchor({
            status: 'VERIFIED',
            fabricTransactionId: 'tx-real',
            fabricBlockNumber: '12',
            fabricChannel: 'mepn-audit',
            fabricChaincode: 'audit-anchor',
            fabricCommitStatus: 'VALID',
            fabricEndorsementStatus: 'ENDORSED',
            anchoredAt: new Date('2026-06-06T00:00:00.000Z'),
            fabricVerifiedAt: new Date('2026-06-06T00:01:00.000Z'),
          }),
        ),
      },
    } as never);

    const status = await service.getFabricStatus();

    expect(status).toMatchObject({
      mode: 'gateway',
      gatewayConfigured: true,
      gatewayMaterialReady: true,
      secretMaterial: {
        required: true,
        allPresent: true,
        missing: [],
      },
      latestRealAnchor: {
        present: true,
        status: 'VERIFIED',
        hasTransactionId: true,
        hasBlockNumber: true,
        channelRecorded: true,
        chaincodeRecorded: true,
      },
    });
    expect(JSON.stringify(status)).not.toContain('tx-real');
    expect(JSON.stringify(status)).not.toContain(secretRoot);

    rmSync(secretRoot, { recursive: true, force: true });
  });

  it('formats fresh worker heartbeat as healthy', async () => {
    const service = new IntegrationStatusService({
      workerHeartbeat: {
        findMany: jest.fn().mockResolvedValue([
          workerHeartbeat({
            status: 'idle',
            lastSeenAt: new Date(),
          }),
        ]),
      },
    } as never);

    await expect(service.listWorkerHeartbeats()).resolves.toMatchObject([
      {
        workerName: 'outbox-worker',
        queueName: 'outbox',
        status: 'idle',
        healthStatus: 'healthy',
      },
    ]);
  });

  it('formats stale worker heartbeat as unavailable', async () => {
    const service = new IntegrationStatusService({
      workerHeartbeat: {
        findMany: jest.fn().mockResolvedValue([
          workerHeartbeat({
            status: 'idle',
            lastSeenAt: new Date('2000-01-01T00:00:00.000Z'),
          }),
        ]),
      },
    } as never);

    await expect(service.listWorkerHeartbeats()).resolves.toMatchObject([
      {
        healthStatus: 'unavailable',
      },
    ]);
  });

  it('builds a sanitized operations timeline with filters', async () => {
    const service = new IntegrationStatusService({
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      },
      workerHeartbeat: {
        findMany: jest.fn().mockResolvedValue([
          workerHeartbeat({
            id: 'worker-1',
            status: 'idle',
            lastSeenAt: new Date('2026-06-06T00:00:00.000Z'),
          }),
        ]),
      },
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([
          outboxEvent({
            id: 'outbox-1',
            payload: {
              hidden: `${'token'}=not-allowed`,
            },
            attempts: 1,
            lastError: 'Provider timeout',
            status: 'PENDING',
            reconciliationRecord: null,
            updatedAt: new Date('2026-06-06T00:01:00.000Z'),
          }),
        ]),
      },
      integrationReconciliationRecord: {
        findMany: jest.fn().mockResolvedValue([
          reconciliationRecord({
            id: 'reconciliation-1',
            status: 'FAILED',
            outboxEvent: null,
            updatedAt: new Date('2026-06-06T00:02:00.000Z'),
          }),
        ]),
      },
      auditAnchor: {
        findMany: jest.fn().mockResolvedValue([
          auditAnchor({
            id: 'anchor-1',
            status: 'VERIFIED',
            anchoredAt: new Date('2026-06-06T00:03:00.000Z'),
            rootHash: 'do-not-render-root-hash',
          }),
        ]),
      },
      reportExportJob: {
        findMany: jest.fn().mockResolvedValue([
          reportExportJob({
            id: 'report-1',
            status: 'completed',
            format: 'csv',
            updatedAt: new Date('2026-06-06T00:04:00.000Z'),
            metadata: {
              secret: 'not allowed',
            },
          }),
        ]),
      },
    } as never);

    const timeline = await service.listTimeline({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      limit: '10',
    });

    expect(timeline.map((item) => item.category)).toEqual([
      'report',
      'fabric',
      'reconciliation',
      'outbox',
      'worker',
    ]);
    expect(JSON.stringify(timeline)).not.toContain('not-allowed');
    expect(JSON.stringify(timeline)).not.toContain('do-not-render-root-hash');
    expect(JSON.stringify(timeline)).not.toContain('secret');

    await expect(
      service.listTimeline({
        organizationId: 'org-1',
        actorUserId: 'user-1',
        category: 'outbox',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        category: 'outbox',
        severity: 'warning',
      }),
    ]);
  });

  it('requires active membership for scoped timeline reads', async () => {
    const service = new IntegrationStatusService({
      membership: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as never);

    await expect(
      service.listTimeline({
        organizationId: 'org-1',
        actorUserId: 'outsider',
      }),
    ).rejects.toThrow('Active organization membership required');
  });
});

function workerHeartbeat(overrides: Record<string, unknown> = {}) {
  return {
    id: 'worker-heartbeat-1',
    workerName: 'outbox-worker',
    queueName: 'outbox',
    status: 'idle',
    lastSeenAt: new Date(),
    processedCount: 2,
    failedCount: 1,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function outboxEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'outbox-1',
    organizationId: 'org-1',
    eventType: 'FABRIC_ANCHOR_REQUESTED',
    aggregateType: 'PurchaseOrder',
    aggregateId: 'po-1',
    payload: {},
    status: 'PENDING',
    attempts: 0,
    nextRunAt: new Date(),
    availableAt: null,
    lastError: null,
    idempotencyKey: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    reconciliationRecord: null,
    ...overrides,
  };
}

function reconciliationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reconciliation-1',
    organizationId: 'org-1',
    outboxEventId: null,
    integrationType: 'FABRIC',
    aggregateType: 'PurchaseOrder',
    aggregateId: 'po-1',
    externalReference: null,
    status: 'PENDING',
    requestPayload: {},
    responsePayload: null,
    lastError: null,
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    outboxEvent: null,
    ...overrides,
  };
}

function auditAnchor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'anchor-1',
    organizationId: 'org-1',
    anchorType: 'FABRIC',
    status: 'PENDING',
    fromAuditEventId: null,
    toAuditEventId: null,
    rootHash: 'hash',
    metadata: {},
    anchoredAt: null,
    fabricTransactionId: null,
    fabricBlockNumber: null,
    fabricChannel: null,
    fabricChaincode: null,
    fabricCommitStatus: null,
    fabricEndorsementStatus: null,
    fabricVerifiedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function reportExportJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    organizationId: 'org-1',
    reportType: 'procurement',
    format: 'json',
    status: 'queued',
    requestedByUserId: 'user-1',
    filePath: null,
    objectKey: null,
    errorMessage: null,
    metadata: {},
    expiresAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mkFabricSecretRoot() {
  const root = mkdtempSafe();
  mkdirSync(join(root, 'identity'), { recursive: true });
  mkdirSync(join(root, 'tls'), { recursive: true });
  writeFileSync(join(root, 'identity', 'cert.pem'), 'CERT_PLACEHOLDER');
  writeFileSync(join(root, 'identity', 'key.pem'), 'KEY_PLACEHOLDER');
  writeFileSync(join(root, 'tls', 'ca.crt'), 'TLS_PLACEHOLDER');

  return root;
}

function mkdtempSafe() {
  return mkdtempSync(join(tmpdir(), 'mepn-fabric-'));
}
