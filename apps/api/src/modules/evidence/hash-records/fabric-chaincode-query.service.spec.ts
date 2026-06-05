import {
  FabricChaincodeQueryService,
  FabricChaincodeUnavailableError,
} from './fabric-chaincode-query.service';

const gatewayEnv = {
  BLOCKCHAIN_ANCHOR_ADAPTER: 'fabric',
  FABRIC_GATEWAY_URL: 'grpcs://fabric-gateway.example:7051',
  FABRIC_MSP_ID: 'Org1MSP',
  FABRIC_CHANNEL: 'mepn-audit',
  FABRIC_CHAINCODE: 'audit-anchor',
  FABRIC_IDENTITY_CERT_PATH: '/definitely/missing/cert.pem',
  FABRIC_PRIVATE_KEY_PATH: '/definitely/missing/key.pem',
  FABRIC_TLS_CERT_PATH: '/definitely/missing/ca.crt',
  FABRIC_PEER_ENDPOINT: 'peer0.org1.example:7051',
  FABRIC_GATEWAY_HOST_ALIAS: 'peer0.org1.example',
};

describe('FabricChaincodeQueryService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...gatewayEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports missing secret files without exposing file contents', async () => {
    const service = new FabricChaincodeQueryService();

    await expect(service.readAnchor('anchor-1')).rejects.toThrow(
      FabricChaincodeUnavailableError,
    );
    await expect(service.readAnchor('anchor-1')).rejects.toThrow(
      'Fabric Gateway secret/config material is missing or unreadable',
    );
  });
});
