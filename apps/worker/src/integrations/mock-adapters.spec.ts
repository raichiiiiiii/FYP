import { MockIntegrationAdapters } from './mock-adapters';

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

describe('MockIntegrationAdapters', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns a mock anchor result when Fabric runs in explicit mock mode', () => {
    process.env.FABRIC_ENABLED = 'true';
    process.env.FABRIC_MODE = 'mock';

    const adapters = new MockIntegrationAdapters();
    const result = adapters.dispatch('FABRIC_ANCHOR_REQUESTED', {
      entityType: 'EvidencePack',
      entityId: 'pack-001',
      canonicalHash: 'abc123def4567890',
    });

    expect(result.integrationType).toBe('FABRIC');
    expect(result.status).toBe('ANCHORED_MOCK');
    expect(result.externalReference).toBe('mock-tx-abc123def456');
  });

  it('does not produce a mock anchor result when Fabric gateway mode is configured', () => {
    process.env = {
      ...process.env,
      ...gatewayEnv,
    };

    const adapters = new MockIntegrationAdapters();

    expect(() =>
      adapters.dispatch('FABRIC_ANCHOR_REQUESTED', {
        entityType: 'EvidencePack',
        entityId: 'pack-001',
        canonicalHash: 'abc123def4567890',
      }),
    ).toThrow(
      'FABRIC_MODE=gateway requires the real Fabric Gateway adapter; mock Fabric anchoring is disabled.',
    );
  });
});
