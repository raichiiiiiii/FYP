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
      realGatewayAdapterImplemented: false,
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
      realGatewayAdapterImplemented: false,
      anchorResultSource: 'real-gateway-required',
      missingGatewayConfig: [],
      configuredChannel: 'configured',
      configuredChaincode: 'configured',
      configuredMspId: 'configured',
    });
    expect(JSON.stringify(service.getFabricStatus())).not.toContain(
      gatewayEnv.FABRIC_GATEWAY_URL,
    );
  });
});
