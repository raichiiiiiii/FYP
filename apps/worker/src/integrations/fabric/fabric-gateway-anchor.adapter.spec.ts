import { IntegrationAdapterError } from '../integration-adapter-error';
import { FabricGatewayAnchorAdapter } from './fabric-gateway-anchor.adapter';
import type {
  FabricGatewayClient,
  FabricGatewayClientFactory,
} from './fabric-gateway-client.factory';

const canonicalHash =
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

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

describe('FabricGatewayAnchorAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ...gatewayEnv,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('submits CreateAnchor through the Gateway client and maps real metadata', async () => {
    const submitCreateAnchor = jest.fn().mockResolvedValue({
      transactionId: 'real-tx-1',
      blockNumber: 42,
      commitStatus: 'VALID',
    });
    const close = jest.fn();
    const client: FabricGatewayClient = {
      submitCreateAnchor,
      close,
    };
    const create = jest.fn().mockResolvedValue(client);
    const factory = {
      create,
    } as unknown as FabricGatewayClientFactory;
    const adapter = new FabricGatewayAnchorAdapter(factory);

    const result = await adapter.anchor({
      organizationId: 'org-1',
      entityType: 'EvidencePack',
      entityId: 'pack-1',
      canonicalHash,
      timestamp: '2026-06-05T00:00:00.000Z',
      idempotencyKey: `fabric:org-1:EvidencePack:pack-1:${canonicalHash}`,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'mepn-audit',
        chaincode: 'audit-anchor',
      }),
    );
    expect(submitCreateAnchor).toHaveBeenCalledWith([
      expect.any(String),
      'org-1',
      'EvidencePack',
      'pack-1',
      canonicalHash,
      '2026-06-05T00:00:00.000Z',
      `fabric:org-1:EvidencePack:pack-1:${canonicalHash}`,
      JSON.stringify({
        source: 'mepn-worker',
      }),
    ]);
    expect(result).toMatchObject({
      integrationType: 'FABRIC',
      externalReference: 'real-tx-1',
      status: 'ANCHORED',
      responsePayload: {
        fabricTransactionId: 'real-tx-1',
        fabricBlockNumber: 42,
        fabricChannel: 'mepn-audit',
        fabricChaincode: 'audit-anchor',
        fabricCommitStatus: 'VALID',
        status: 'ANCHORED',
      },
    });
    expect(close).toHaveBeenCalled();
  });

  it('classifies invalid payloads as non-retryable failures', async () => {
    const adapter = new FabricGatewayAnchorAdapter({
      create: jest.fn(),
    });

    await expect(
      adapter.anchor({
        entityType: 'EvidencePack',
        entityId: 'pack-1',
        canonicalHash: 'abc123',
      }),
    ).rejects.toMatchObject<Partial<IntegrationAdapterError>>({
      status: 'FAILED',
      retryable: false,
    });
  });

  it('classifies missing certificate material as configuration failure', async () => {
    const adapter = new FabricGatewayAnchorAdapter({
      create: jest.fn().mockRejectedValue(new Error('ENOENT client.crt')),
    });

    await expect(
      adapter.anchor({
        entityType: 'EvidencePack',
        entityId: 'pack-1',
        canonicalHash,
      }),
    ).rejects.toMatchObject<Partial<IntegrationAdapterError>>({
      status: 'FABRIC_CONFIGURATION_ERROR',
      retryable: false,
    });
  });

  it('classifies Gateway unavailability as retryable', async () => {
    const adapter = new FabricGatewayAnchorAdapter({
      create: jest.fn().mockRejectedValue(new Error('14 UNAVAILABLE')),
    });

    await expect(
      adapter.anchor({
        entityType: 'EvidencePack',
        entityId: 'pack-1',
        canonicalHash,
      }),
    ).rejects.toMatchObject<Partial<IntegrationAdapterError>>({
      status: 'FABRIC_UNAVAILABLE',
      retryable: true,
    });
  });
});
