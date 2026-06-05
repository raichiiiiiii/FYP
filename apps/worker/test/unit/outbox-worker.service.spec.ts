import { OutboxWorkerService } from '../../src/outbox/outbox-worker.service';

describe('NFR-11 Worker outbox retry unit rules', () => {
  const originalMaxAttempts = process.env.WORKER_MAX_ATTEMPTS;

  afterEach(() => {
    if (originalMaxAttempts === undefined) {
      delete process.env.WORKER_MAX_ATTEMPTS;
    } else {
      process.env.WORKER_MAX_ATTEMPTS = originalMaxAttempts;
    }
    jest.restoreAllMocks();
  });

  it('requeues failed events for retry without external infrastructure', async () => {
    process.env.WORKER_MAX_ATTEMPTS = '3';
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    const event = {
      id: 'outbox-1',
      organizationId: 'org-1',
      eventType: 'FABRIC_ANCHOR_REQUESTED',
      aggregateType: 'HashRecord',
      aggregateId: 'hash-1',
      payload: {
        canonicalHash: 'abc123',
      },
      attempts: 1,
    };
    const claimTx = {
      outboxEvent: {
        findFirst: jest.fn().mockResolvedValue(event),
        update: jest.fn().mockResolvedValue({
          ...event,
          status: 'PROCESSING',
          attempts: 2,
        }),
      },
    };
    const emptyTx = {
      outboxEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    type TransactionClient = typeof claimTx | typeof emptyTx;
    type TransactionCallback = (tx: TransactionClient) => Promise<unknown>;
    let transactionCalls = 0;
    const prisma = {
      $transaction: (callback: TransactionCallback) => {
        transactionCalls += 1;
        return callback(transactionCalls === 1 ? claimTx : emptyTx);
      },
      outboxEvent: {
        update: jest.fn(),
      },
      integrationReconciliationRecord: {
        upsert: jest.fn(),
      },
      workerHeartbeat: {
        upsert: jest.fn(),
      },
    };
    const adapters = {
      dispatch: jest.fn(() => {
        throw new Error('Fabric unavailable');
      }),
    };
    const service = new OutboxWorkerService(prisma as never, adapters as never);

    await service.runOnce();

    expect(adapters.dispatch).toHaveBeenCalledWith('FABRIC_ANCHOR_REQUESTED', {
      aggregateId: 'hash-1',
      aggregateType: 'HashRecord',
      canonicalHash: 'abc123',
    });
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: {
        id: 'outbox-1',
      },
      data: {
        status: 'PENDING',
        lastError: 'Fabric unavailable',
        nextRunAt: new Date(41_000),
      },
    });
  });
});
