import { OutboxWorkerService } from '../../src/outbox/outbox-worker.service';
import {
  closeWorkerIntegrationContext,
  createWorkerIntegrationContext,
  type WorkerIntegrationContext,
} from './helpers/worker-integration-test-context';

describe('Integration: worker retry policy', () => {
  let context: WorkerIntegrationContext;

  beforeAll(async () => {
    context = await createWorkerIntegrationContext();
  });

  afterAll(async () => {
    await closeWorkerIntegrationContext(context);
  });

  it('increments attempts and requeues failed integration events', async () => {
    const event = await context.prisma.outboxEvent.create({
      data: {
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        aggregateType: 'HashRecord',
        aggregateId: 'hash-1',
        payload: {
          canonicalHash: 'abc123',
        },
      },
    });
    const failingWorker = new OutboxWorkerService(context.prisma, {
      dispatch: () => {
        throw new Error('Gateway unavailable');
      },
    } as never);

    await failingWorker.runOnce();

    await expect(
      context.prisma.outboxEvent.findUnique({ where: { id: event.id } }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'PENDING',
        attempts: 1,
        lastError: 'Gateway unavailable',
      }),
    );
  });
});
