import request from 'supertest';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: node status', () => {
  let context: IntegrationAppContext;
  const originalEnv = process.env;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    process.env = originalEnv;
    await closeIntegrationApp(context);
  });

  it('GET /api/v1/node/status returns self-hosted compatibility status safely', async () => {
    process.env.FABRIC_PRIVATE_KEY_PEM = '-----BEGIN PRIVATE KEY-----unsafe';
    process.env.FABRIC_CHANNEL = 'mepn-audit';
    process.env.FABRIC_CHAINCODE = 'audit-anchor';
    process.env.FABRIC_MSP_ID = 'Org1MSP';

    const response = await request(context.app.getHttpServer())
      .get('/api/v1/node/status')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        service: 'mepn-api',
        deployment: expect.objectContaining({
          model: 'self-hosted-organization-node',
          localSystemOfRecord: true,
          sharedCloudRequired: false,
        }),
        compatibility: expect.objectContaining({
          apiVersion: 'v1',
          fabricTopologyMode: 'operator_assisted',
          topologyMutationSupported: false,
        }),
        fabric: expect.objectContaining({
          proofInfrastructureOptional: true,
          topologyMutationSupported: false,
          automationReadinessEndpoint: '/api/v1/fabric/automation/readiness',
          uatBlockerDecisionEndpoint: '/api/v1/fabric/uat-blocker-decisions',
          configuredChannel: 'configured',
          configuredChaincode: 'configured',
          configuredMspId: 'configured',
        }),
      }),
    );
    expect(response.body.database.appliedMigrationCount).toBeGreaterThan(0);
    expect(response.body.fabric.uatBlockerDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'UAT-B-003',
          topologyMutationSupported: false,
          directFabricExecutionSupported: false,
          operatorAssistedOnly: true,
          seededProofAccepted: false,
          readAnchorRequired: false,
        }),
        expect.objectContaining({
          id: 'UAT-B-004',
          directFabricExecutionSupported: false,
          operatorAssistedOnly: false,
          seededProofAccepted: false,
          liveEvidenceRequired: true,
          readAnchorRequired: true,
        }),
      ]),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /BEGIN PRIVATE KEY|FABRIC_PRIVATE_KEY_PEM|password|token|grpcs:\/\//i,
    );
  });
});
