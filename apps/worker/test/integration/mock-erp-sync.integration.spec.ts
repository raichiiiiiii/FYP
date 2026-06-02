import {
  closeWorkerIntegrationContext,
  createWorkerIntegrationContext,
  type WorkerIntegrationContext,
} from './helpers/worker-integration-test-context';

describe('Integration: mock ERP sync adapter', () => {
  let context: WorkerIntegrationContext;

  beforeAll(async () => {
    context = await createWorkerIntegrationContext();
  });

  afterAll(async () => {
    await closeWorkerIntegrationContext(context);
  });

  it('syncs an aggregate through the mock ERP adapter', async () => {
    const event = await context.prisma.outboxEvent.create({
      data: {
        eventType: 'ERP_SYNC_REQUESTED',
        aggregateType: 'Invoice',
        aggregateId: 'invoice-1',
        payload: {
          aggregateType: 'Invoice',
          aggregateId: 'invoice-1',
        },
      },
    });

    await context.worker.runOnce();

    await expect(
      context.prisma.integrationReconciliationRecord.findUnique({
        where: { outboxEventId: event.id },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        integrationType: 'ERP',
        status: 'SYNCED_MOCK',
        externalReference: 'mock-erp-Invoice-invoice-1',
      }),
    );
  });
});
