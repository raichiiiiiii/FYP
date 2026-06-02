import { BadRequestException } from '@nestjs/common';
import { AuditEventsService } from '../../../src/audit-events/audit-events.service';

describe('FR-47 Audit event unit rules', () => {
  function createService() {
    const prisma = {
      auditEvent: {
        create: jest.fn(),
      },
    };

    return {
      prisma,
      service: new AuditEventsService(prisma as never),
    };
  }

  it('requires an event type', () => {
    const { service, prisma } = createService();

    expect(() =>
      service.create({
        eventType: '',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
      }),
    ).toThrow(BadRequestException);
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('requires an entity reference', () => {
    const { service, prisma } = createService();

    expect(() =>
      service.create({
        eventType: 'PURCHASE_ORDER_CREATED',
        entityType: 'PurchaseOrder',
      }),
    ).toThrow('entityType and entityId are required');
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('persists valid audit events', () => {
    const { service, prisma } = createService();
    prisma.auditEvent.create.mockReturnValue({
      id: 'audit-1',
      eventType: 'PURCHASE_ORDER_CREATED',
    });

    expect(
      service.create({
        organizationId: 'org-1',
        actorUserId: 'user-1',
        eventType: 'PURCHASE_ORDER_CREATED',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
      }),
    ).toEqual({
      id: 'audit-1',
      eventType: 'PURCHASE_ORDER_CREATED',
    });
  });
});
