import type { OutboxEvent } from '@prisma/client';
import { OutboxWorkerService } from './outbox-worker.service';

const now = new Date('2026-06-05T00:00:00.000Z');

describe('OutboxWorkerService heartbeat', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WORKER_POLL_ENABLED: 'true',
    };
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it('records running and idle heartbeats for an empty polling run', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = prismaForEvents([], upsert);
    const service = new OutboxWorkerService(prisma, {} as never);

    await service.runOnce();

    const calls = heartbeatCalls(upsert);

    expect(calls[0].create.status).toBe('running');
    expect(calls.at(-1)?.update).toMatchObject({
      status: 'idle',
      processedCount: {
        increment: 0,
      },
      failedCount: {
        increment: 0,
      },
    });
  });

  it('increments processed heartbeat count after a successful event', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = prismaForEvents([outboxEvent()], upsert);
    const adapters = {
      dispatch: jest.fn().mockResolvedValue({
        integrationType: 'ERP',
        externalReference: 'ERP-1',
        status: 'SYNCED_MOCK',
        responsePayload: {},
      }),
    };
    const service = new OutboxWorkerService(prisma, adapters as never);

    await service.runOnce();

    expect(heartbeatCalls(upsert).at(-1)?.update).toMatchObject({
      processedCount: {
        increment: 1,
      },
      failedCount: {
        increment: 0,
      },
    });
  });
});

type HeartbeatUpsertCall = {
  create: {
    status: string;
  };
  update: {
    status: string;
    processedCount: {
      increment: number;
    };
    failedCount: {
      increment: number;
    };
  };
};

function heartbeatCalls(upsert: jest.Mock): HeartbeatUpsertCall[] {
  return upsert.mock.calls.map(([input]) => input as HeartbeatUpsertCall);
}

function prismaForEvents(events: OutboxEvent[], upsert: jest.Mock) {
  let index = 0;
  const tx = {
    outboxEvent: {
      findFirst: jest.fn().mockImplementation(() => events[index++] ?? null),
      update: jest
        .fn()
        .mockImplementation((input: { data: Partial<OutboxEvent> }) => ({
          ...events[index - 1],
          ...input.data,
        })),
    },
  };

  return {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
    workerHeartbeat: {
      upsert,
    },
    integrationReconciliationRecord: {
      upsert: jest.fn(),
    },
    outboxEvent: {
      update: jest.fn(),
    },
  } as never;
}

function outboxEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
  return {
    id: 'outbox-1',
    organizationId: 'org-1',
    eventType: 'ERP_SYNC_REQUESTED',
    aggregateType: 'PurchaseOrder',
    aggregateId: 'po-1',
    payload: {},
    status: 'PENDING',
    attempts: 0,
    nextRunAt: now,
    availableAt: null,
    lastError: null,
    idempotencyKey: 'erp:po-1',
    processedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
