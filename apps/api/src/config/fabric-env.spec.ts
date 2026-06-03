import { readFabricEnv } from './fabric-env';

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
  FABRIC_SUBMIT_TIMEOUT_MS: '45000',
  FABRIC_COMMIT_TIMEOUT_MS: '60000',
};

describe('readFabricEnv', () => {
  it('defaults to disabled mock mode without requiring Fabric credentials', () => {
    expect(readFabricEnv({})).toEqual({
      enabled: false,
      mode: 'mock',
      gatewayUrl: '',
      mspId: '',
      channel: '',
      chaincode: '',
      identityCertPath: '',
      privateKeyPath: '',
      tlsCertPath: '',
      peerEndpoint: '',
      gatewayHostAlias: '',
      submitTimeoutMs: 30000,
      commitTimeoutMs: 30000,
    });
  });

  it('treats FABRIC_ENABLED=true as gateway mode unless mock is explicit', () => {
    expect(() => readFabricEnv({ FABRIC_ENABLED: 'true' })).toThrow(
      'FABRIC_GATEWAY_URL is required when FABRIC_MODE=gateway',
    );
  });

  it('allows explicit mock mode even when Fabric integration is enabled', () => {
    expect(
      readFabricEnv({
        FABRIC_ENABLED: 'true',
        FABRIC_MODE: 'mock',
      }),
    ).toMatchObject({
      enabled: true,
      mode: 'mock',
    });
  });

  it('validates required gateway configuration', () => {
    expect(readFabricEnv(gatewayEnv)).toMatchObject({
      enabled: true,
      mode: 'gateway',
      gatewayUrl: gatewayEnv.FABRIC_GATEWAY_URL,
      mspId: gatewayEnv.FABRIC_MSP_ID,
      channel: gatewayEnv.FABRIC_CHANNEL,
      chaincode: gatewayEnv.FABRIC_CHAINCODE,
      submitTimeoutMs: 45000,
      commitTimeoutMs: 60000,
    });
  });

  it('rejects invalid mode and timeout values', () => {
    expect(() => readFabricEnv({ FABRIC_MODE: 'real' })).toThrow(
      'FABRIC_MODE must be either "mock" or "gateway"',
    );
    expect(() =>
      readFabricEnv({
        ...gatewayEnv,
        FABRIC_SUBMIT_TIMEOUT_MS: '0',
      }),
    ).toThrow('FABRIC_SUBMIT_TIMEOUT_MS must be a positive number');
  });
});
