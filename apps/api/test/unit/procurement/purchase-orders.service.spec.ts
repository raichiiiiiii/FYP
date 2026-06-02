import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from '../../../src/modules/procurement/purchase-orders/purchase-orders.service';

describe('FR-14 Purchase order unit rules', () => {
  function createService() {
    const prisma = {
      requisition: {
        findUnique: jest.fn(),
      },
      supplier: {
        findUnique: jest.fn(),
      },
      quotation: {
        findUnique: jest.fn(),
      },
      purchaseOrder: {
        create: jest.fn(),
      },
    };
    const auditEvents = {
      create: jest.fn(),
    };

    return {
      prisma,
      auditEvents,
      service: new PurchaseOrdersService(prisma as never, auditEvents as never),
    };
  }

  const input = {
    organizationId: 'org-1',
    requisitionId: 'req-1',
    supplierId: 'supplier-1',
    items: [
      {
        description: 'Server equipment',
        quantity: 2,
        unitPrice: 1000,
      },
    ],
  };

  it('does not create a purchase order from a rejected requisition', async () => {
    const { service, prisma } = createService();
    prisma.requisition.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationId: 'org-1',
      status: 'REJECTED',
    });
    prisma.supplier.findUnique.mockResolvedValue({
      id: 'supplier-1',
      organizationId: 'org-1',
    });

    await expect(service.create(input)).rejects.toThrow(BadRequestException);
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it('creates a purchase order from an approved requisition', async () => {
    const { service, prisma, auditEvents } = createService();
    prisma.requisition.findUnique.mockResolvedValue({
      id: 'req-1',
      organizationId: 'org-1',
      status: 'APPROVED',
    });
    prisma.supplier.findUnique.mockResolvedValue({
      id: 'supplier-1',
      organizationId: 'org-1',
    });
    prisma.purchaseOrder.create.mockResolvedValue({
      id: 'po-1',
      organizationId: 'org-1',
      requisitionId: 'req-1',
      supplierId: 'supplier-1',
      poNumber: 'PO-20260602-00001',
      totalAmount: 2000,
    });

    await expect(service.create(input)).resolves.toEqual(
      expect.objectContaining({
        id: 'po-1',
        totalAmount: 2000,
      }),
    );
    expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: 2000,
        }),
      }),
    );
    expect(auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PURCHASE_ORDER_CREATED',
      }),
    );
  });
});
