import { OutboxService } from '../../../src/modules/outbox/outbox.service';

describe('NFR-11 Outbox unit rules', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createService() {
    const prisma = {
      outboxEvent: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    return {
      prisma,
      service: new OutboxService(prisma as never),
    };
  }

  it('uses idempotency keys to create unique integration requests', async () => {
    const { service, prisma } = createService();
    prisma.outboxEvent.findUnique.mockResolvedValue(null);
    prisma.outboxEvent.create.mockResolvedValue({
      id: 'outbox-1',
      idempotencyKey: 'idem-1',
    });

    await expect(
      service.requestIntegration({
        organizationId: 'org-1',
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        aggregateType: 'HashRecord',
        aggregateId: 'hash-1',
        payload: {
          canonicalHash: 'abc123',
        },
        idempotencyKey: 'idem-1',
      }),
    ).resolves.toEqual({
      id: 'outbox-1',
      idempotencyKey: 'idem-1',
    });
    expect(prisma.outboxEvent.findUnique).toHaveBeenCalledWith({
      where: {
        idempotencyKey: 'idem-1',
      },
    });
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey: 'idem-1',
        }),
      }),
    );
  });

  it('rejects duplicate idempotency keys', async () => {
    const { service, prisma } = createService();
    prisma.outboxEvent.findUnique.mockResolvedValue({ id: 'outbox-existing' });

    await expect(
      service.requestIntegration({
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        aggregateType: 'HashRecord',
        aggregateId: 'hash-1',
        payload: {
          canonicalHash: 'abc123',
        },
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toThrow('Outbox idempotency key already exists');
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('schedules failed events for retry', () => {
    const { service, prisma } = createService();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    prisma.outboxEvent.update.mockReturnValue({
      id: 'outbox-1',
      status: 'PENDING',
    });

    expect(service.markFailed('outbox-1', 'Fabric unavailable', 5_000)).toEqual(
      {
        id: 'outbox-1',
        status: 'PENDING',
      },
    );
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'outbox-1',
        },
        data: expect.objectContaining({
          status: 'PENDING',
          lastError: 'Fabric unavailable',
          nextRunAt: new Date(6_000),
        }),
      }),
    );
  });

  it('marks exhausted events as dead letters', () => {
    const { service, prisma } = createService();
    prisma.outboxEvent.update.mockReturnValue({
      id: 'outbox-1',
      status: 'FAILED',
    });

    expect(service.markDeadLetter('outbox-1', 'Max attempts reached')).toEqual({
      id: 'outbox-1',
      status: 'FAILED',
    });
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'FAILED',
          lastError: 'Max attempts reached',
        },
      }),
    );
  });
});
