import { BadRequestException } from '@nestjs/common';
import { RequisitionsService } from '../../../src/modules/procurement/requisitions/requisitions.service';

describe('FR-09/FR-10 Procurement requisition state machine unit rules', () => {
  function createService() {
    const tx = {
      approvalRequest: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      requisition: {
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const auditEvents = {
      create: jest.fn(),
    };
    const service = new RequisitionsService(
      prisma as never,
      auditEvents as never,
    );

    return { service, prisma, tx, auditEvents };
  }

  it('submits a draft requisition', async () => {
    const { service, tx, auditEvents } = createService();
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'req-1',
      organizationId: 'org-1',
      title: 'Materials',
      status: 'DRAFT',
    } as never);
    tx.requisition.update.mockResolvedValue({
      id: 'req-1',
      organizationId: 'org-1',
      title: 'Materials',
      status: 'SUBMITTED',
    });

    await expect(
      service.submit('req-1', {
        actorUserId: 'requester-1',
        approverUserId: 'approver-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'SUBMITTED',
      }),
    );
    expect(tx.approvalRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          approverUserId: 'approver-1',
        }),
      }),
    );
    expect(auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'REQUISITION_SUBMITTED',
      }),
    );
  });

  it('approves a submitted requisition', async () => {
    const { service, tx, auditEvents } = createService();
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'req-1',
      organizationId: 'org-1',
      title: 'Materials',
      totalAmount: 1200,
      status: 'SUBMITTED',
    } as never);
    tx.approvalRequest.findFirst.mockResolvedValue({ id: 'approval-1' });
    tx.requisition.update.mockResolvedValue({
      id: 'req-1',
      organizationId: 'org-1',
      title: 'Materials',
      totalAmount: 1200,
      status: 'APPROVED',
    });

    await expect(
      service.approve('req-1', {
        actorUserId: 'approver-1',
        comment: 'Approved',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'APPROVED',
      }),
    );
    expect(tx.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'APPROVED',
          decision: 'APPROVED',
        }),
      }),
    );
    expect(auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'REQUISITION_APPROVED',
      }),
    );
  });

  it('does not approve a requisition that is not submitted', async () => {
    const { service, prisma } = createService();
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'req-1',
      status: 'REJECTED',
    } as never);

    await expect(service.approve('req-1', {})).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('prevents the requester from approving their own submitted requisition', async () => {
    const { service, prisma } = createService();
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'req-1',
      requesterUserId: 'requester-1',
      status: 'SUBMITTED',
    } as never);

    await expect(
      service.approve('req-1', {
        actorUserId: 'requester-1',
        approverUserId: 'requester-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
