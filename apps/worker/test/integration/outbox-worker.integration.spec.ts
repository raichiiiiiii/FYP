import {
  closeWorkerIntegrationContext,
  createWorkerIntegrationContext,
  type WorkerIntegrationContext,
} from './helpers/worker-integration-test-context';

describe('Integration: worker outbox table', () => {
  let context: WorkerIntegrationContext;

  beforeAll(async () => {
    context = await createWorkerIntegrationContext();
  });

  afterAll(async () => {
    await closeWorkerIntegrationContext(context);
  });

  it('processes a pending outbox event and stores a reconciliation record', async () => {
    const event = await context.prisma.outboxEvent.create({
      data: {
        eventType: 'ESIGNATURE_PACKAGE_REQUESTED',
        aggregateType: 'MudarabahContract',
        aggregateId: 'contract-1',
        payload: {
          aggregateType: 'MudarabahContract',
          aggregateId: 'contract-1',
        },
      },
    });

    await context.worker.runOnce();

    await expect(
      context.prisma.outboxEvent.findUnique({ where: { id: event.id } }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'COMPLETED',
        attempts: 1,
      }),
    );
    await expect(
      context.prisma.integrationReconciliationRecord.findUnique({
        where: { outboxEventId: event.id },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        integrationType: 'ESIGN',
        status: 'PACKAGE_CREATED_MOCK',
      }),
    );
  });
});
