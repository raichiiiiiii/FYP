import {
  closeWorkerIntegrationContext,
  createWorkerIntegrationContext,
  type WorkerIntegrationContext,
} from './helpers/worker-integration-test-context';

describe('Integration: mock Fabric anchor adapter', () => {
  let context: WorkerIntegrationContext;

  beforeAll(async () => {
    process.env.FABRIC_ENABLED = 'true';
    process.env.FABRIC_MODE = 'mock';
    process.env.BLOCKCHAIN_ANCHOR_ADAPTER = 'mock';
    context = await createWorkerIntegrationContext();
  });

  afterAll(async () => {
    await closeWorkerIntegrationContext(context);
  });

  it('anchors a hash through the mock Fabric adapter and writes an audit anchor', async () => {
    const event = await context.prisma.outboxEvent.create({
      data: {
        organizationId: null,
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        aggregateType: 'PurchaseOrder',
        aggregateId: 'po-1',
        payload: {
          entityType: 'PurchaseOrder',
          entityId: 'po-1',
          canonicalHash: 'abcdef1234567890',
        },
      },
    });

    await context.worker.runOnce();

    await expect(
      context.prisma.auditAnchor.findFirst({
        where: {
          status: 'ANCHORED_MOCK',
          rootHash: 'abcdef1234567890',
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        anchorType: 'FABRIC_MOCK',
      }),
    );
    await expect(
      context.prisma.integrationReconciliationRecord.findUnique({
        where: { outboxEventId: event.id },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        integrationType: 'FABRIC',
        status: 'ANCHORED_MOCK',
      }),
    );
  });
});
