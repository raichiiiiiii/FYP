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

  it('reports explicit mock mode without requiring gateway credentials', () => {
    process.env.FABRIC_ENABLED = 'true';
    process.env.FABRIC_MODE = 'mock';

    const service = new IntegrationStatusService({} as never);

    expect(service.getFabricStatus()).toMatchObject({
      enabled: true,
      mode: 'mock',
      gatewayConfigured: false,
      realGatewayAdapterImplemented: true,
      anchorResultSource: 'mock-adapter',
      missingGatewayConfig: [],
      message:
        'Fabric anchoring is running in explicit mock mode for prototype and local testing.',
    });
  });

  it('reports configured gateway mode without exposing secret paths or endpoint values', () => {
    process.env = {
      ...process.env,
      ...gatewayEnv,
    };

    const service = new IntegrationStatusService({} as never);

    expect(service.getFabricStatus()).toMatchObject({
      enabled: true,
      mode: 'gateway',
      gatewayConfigured: true,
      realGatewayAdapterImplemented: true,
      anchorResultSource: 'worker-gateway-adapter',
      missingGatewayConfig: [],
      configuredChannel: 'configured',
      configuredChaincode: 'configured',
      configuredMspId: 'configured',
    });
    expect(JSON.stringify(service.getFabricStatus())).not.toContain(
      gatewayEnv.FABRIC_GATEWAY_URL,
    );
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
