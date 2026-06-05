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
