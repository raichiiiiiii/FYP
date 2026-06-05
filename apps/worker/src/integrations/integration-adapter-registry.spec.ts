import { FabricGatewayAnchorAdapter } from './fabric/fabric-gateway-anchor.adapter';
import { IntegrationAdapterRegistry } from './integration-adapter-registry';
import { MockFabricAnchorAdapter } from './mock-fabric-anchor.adapter';
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

describe('IntegrationAdapterRegistry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('routes non-Fabric events to existing mock adapters', async () => {
    const dispatch = jest.fn().mockReturnValue({
      integrationType: 'ERP',
      externalReference: 'mock-erp',
      status: 'SYNCED_MOCK',
      responsePayload: {},
    });
    const mockAdapters = {
      dispatch,
    } as unknown as MockIntegrationAdapters;
    const registry = new IntegrationAdapterRegistry(
      mockAdapters,
      {} as MockFabricAnchorAdapter,
      {} as FabricGatewayAnchorAdapter,
    );

    await expect(
      registry.dispatch('ERP_SYNC_REQUESTED', {}),
    ).resolves.toMatchObject({
      status: 'SYNCED_MOCK',
    });
    expect(dispatch).toHaveBeenCalledWith('ERP_SYNC_REQUESTED', {});
  });

  it('routes Fabric events to mock Fabric adapter in mock mode', async () => {
    process.env.FABRIC_ENABLED = 'true';
    process.env.FABRIC_MODE = 'mock';

    const mockAnchor = jest.fn().mockReturnValue({
      integrationType: 'FABRIC',
      externalReference: 'mock-tx',
      status: 'ANCHORED_MOCK',
      responsePayload: {},
    });
    const mockFabric = {
      anchor: mockAnchor,
    } as unknown as MockFabricAnchorAdapter;
    const gatewayAnchor = jest.fn();
    const gateway = {
      anchor: gatewayAnchor,
    } as unknown as FabricGatewayAnchorAdapter;
    const registry = new IntegrationAdapterRegistry(
      {} as MockIntegrationAdapters,
      mockFabric,
      gateway,
    );

    await expect(
      registry.dispatch('FABRIC_ANCHOR_REQUESTED', {}),
    ).resolves.toMatchObject({
      status: 'ANCHORED_MOCK',
    });
    expect(mockAnchor).toHaveBeenCalled();
    expect(gatewayAnchor).not.toHaveBeenCalled();
  });

  it('routes Fabric events to Gateway adapter in gateway mode', async () => {
    process.env = {
      ...process.env,
      ...gatewayEnv,
    };

    const mockAnchor = jest.fn();
    const mockFabric = {
      anchor: mockAnchor,
    } as unknown as MockFabricAnchorAdapter;
    const gatewayAnchor = jest.fn().mockResolvedValue({
      integrationType: 'FABRIC',
      externalReference: 'real-tx',
      status: 'ANCHORED',
      responsePayload: {},
    });
    const gateway = {
      anchor: gatewayAnchor,
    } as unknown as FabricGatewayAnchorAdapter;
    const registry = new IntegrationAdapterRegistry(
      {} as MockIntegrationAdapters,
      mockFabric,
      gateway,
    );

    await expect(
      registry.dispatch('FABRIC_ANCHOR_REQUESTED', {}),
    ).resolves.toMatchObject({
      status: 'ANCHORED',
    });
    expect(gatewayAnchor).toHaveBeenCalled();
    expect(mockAnchor).not.toHaveBeenCalled();
  });
});
