import { readFabricEnv } from '../../src/config/fabric-env';
import {
  calculateFabricAnchorId,
  deriveFabricIdempotencyKey,
} from '../../src/integrations/fabric/fabric-anchor-payload';
import { FabricGatewayClientFactory } from '../../src/integrations/fabric/fabric-gateway-client.factory';
import {
  closeWorkerIntegrationContext,
  createWorkerIntegrationContext,
  type WorkerIntegrationContext,
} from './helpers/worker-integration-test-context';

const fabricTestEnabled = process.env.FABRIC_TEST_NETWORK_ENABLED === 'true';
const fabricDescribe = fabricTestEnabled ? describe : describe.skip;
const canonicalHash =
  '1111111111111111111111111111111111111111111111111111111111111111';

fabricDescribe('Integration: real Fabric Gateway anchor path', () => {
  let context: WorkerIntegrationContext | undefined;

  beforeAll(async () => {
    process.env.FABRIC_ENABLED = 'true';
    process.env.FABRIC_MODE = 'gateway';
    readFabricEnv();
    context = await createWorkerIntegrationContext();
  });

  afterAll(async () => {
    if (context) {
      await closeWorkerIntegrationContext(context);
    }
  });

  it('submits a hash-only anchor or records a classified Gateway failure', async () => {
    if (!context) {
      throw new Error('Worker integration context was not initialized');
    }

    const idempotencyKey = deriveFabricIdempotencyKey({
      organizationId: 'org-fabric-test',
      entityType: 'PurchaseOrder',
      entityId: 'po-fabric-test',
      canonicalHash,
    });
    const anchorId = calculateFabricAnchorId(idempotencyKey);
    const event = await context.prisma.outboxEvent.create({
      data: {
        organizationId: 'org-fabric-test',
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        aggregateType: 'PurchaseOrder',
        aggregateId: 'po-fabric-test',
        idempotencyKey,
        payload: {
          organizationId: 'org-fabric-test',
          entityType: 'PurchaseOrder',
          entityId: 'po-fabric-test',
          canonicalHash,
          timestamp: '2026-06-05T00:00:00.000Z',
        },
      },
    });

    await context.worker.runOnce();

    const processed = await context.prisma.outboxEvent.findUnique({
      where: { id: event.id },
      include: {
        reconciliationRecord: true,
      },
    });

    expect(processed).toBeTruthy();

    if (processed?.status !== 'COMPLETED') {
      expect(['PENDING', 'FAILED']).toContain(processed?.status);
      expect(processed?.reconciliationRecord?.status).toMatch(
        /FABRIC_UNAVAILABLE|FABRIC_CONFIGURATION_ERROR|FAILED/,
      );
      return;
    }

    expect(processed.reconciliationRecord).toMatchObject({
      integrationType: 'FABRIC',
      status: 'ANCHORED',
    });

    const anchor = await context.prisma.auditAnchor.findFirst({
      where: {
        organizationId: 'org-fabric-test',
        rootHash: canonicalHash,
      },
    });

    expect(anchor).toMatchObject({
      anchorType: 'FABRIC',
      status: 'ANCHORED',
      fabricTransactionId: expect.any(String),
      fabricChannel: process.env.FABRIC_CHANNEL,
      fabricChaincode: process.env.FABRIC_CHAINCODE,
    });

    const client = await new FabricGatewayClientFactory().create(
      readFabricEnv(),
    );

    try {
      const onChainAnchor = await client.evaluateReadAnchor(anchorId);

      expect(onChainAnchor).toMatchObject({
        anchorId,
        canonicalHash,
      });
    } finally {
      client.close();
    }
  });
});
