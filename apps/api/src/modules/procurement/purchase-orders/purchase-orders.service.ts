import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  type ProcurementLineItemInput,
  normalizeLineItems,
  optionalText,
  requireText,
  totalAmount,
} from '../procurement.service-utils';

const purchaseOrderInclude = {
  supplier: true,
  requisition: {
    select: {
      id: true,
      title: true,
      status: true,
      totalAmount: true,
    },
  },
  quotation: {
    include: {
      supplier: true,
    },
  },
  items: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  receipts: {
    orderBy: {
      receivedAt: 'desc',
    },
  },
  invoices: {
    orderBy: {
      issuedAt: 'desc',
    },
  },
} satisfies Prisma.PurchaseOrderInclude;

export type CreatePurchaseOrderInput = {
  organizationId: string;
  actorUserId?: string;
  quotationId?: string;
  requisitionId?: string;
  supplierId?: string;
  poNumber?: string;
  items?: ProcurementLineItemInput[];
};

export type PurchaseOrderTransitionInput = {
  actorUserId?: string;
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreatePurchaseOrderInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');

    const quotationId = optionalText(input.quotationId);
    let requisitionId = optionalText(input.requisitionId);
    let supplierId = optionalText(input.supplierId);
    let items = input.items?.length ? normalizeLineItems(input.items) : [];

    if (quotationId) {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id: quotationId },
        include: {
          items: true,
          rfq: true,
        },
      });

      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }

      if (quotation.organizationId !== organizationId) {
        throw new BadRequestException(
          'Quotation does not belong to the organization',
        );
      }

      requisitionId = quotation.rfq.requisitionId;
      supplierId = quotation.supplierId;
      items = input.items?.length
        ? items
        : quotation.items.map((item) => ({
            description: item.description,
            category: undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }));
    }

    if (!requisitionId) {
      throw new BadRequestException('requisitionId is required');
    }

    if (!supplierId) {
      throw new BadRequestException('supplierId is required');
    }

    if (!items.length) {
      throw new BadRequestException('At least one line item is required');
    }

    const [requisition, supplier] = await Promise.all([
      this.prisma.requisition.findUnique({
        where: { id: requisitionId },
      }),
      this.prisma.supplier.findUnique({
        where: { id: supplierId },
      }),
    ]);

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (
      requisition.organizationId !== organizationId ||
      supplier.organizationId !== organizationId
    ) {
      throw new BadRequestException(
        'Purchase order records must belong to the same organization',
      );
    }

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        requisitionId,
        quotationId,
        supplierId,
        poNumber: optionalText(input.poNumber) || this.createPoNumber(),
        totalAmount: totalAmount(items),
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: purchaseOrderInclude,
    });

    await this.auditEvents.create({
      organizationId: purchaseOrder.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'PURCHASE_ORDER_CREATED',
      entityType: 'PurchaseOrder',
      entityId: purchaseOrder.id,
      metadata: {
        poNumber: purchaseOrder.poNumber,
        requisitionId: purchaseOrder.requisitionId,
        supplierId: purchaseOrder.supplierId,
        totalAmount: purchaseOrder.totalAmount,
      },
    });

    return purchaseOrder;
  }

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
      },
      include: purchaseOrderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async issue(id: string, input: PurchaseOrderTransitionInput) {
    const current = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Purchase order not found');
    }

    if (current.status !== 'DRAFT') {
      throw new BadRequestException('Only draft purchase orders can be issued');
    }

    const purchaseOrder = await this.prisma.$transaction(async (tx) => {
      const issued = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
        },
        include: purchaseOrderInclude,
      });

      await tx.requisition.update({
        where: { id: issued.requisitionId },
        data: {
          status: 'PO_ISSUED',
        },
      });

      return issued;
    });

    await this.auditEvents.create({
      organizationId: purchaseOrder.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'PURCHASE_ORDER_ISSUED',
      entityType: 'PurchaseOrder',
      entityId: purchaseOrder.id,
      metadata: {
        poNumber: purchaseOrder.poNumber,
        requisitionId: purchaseOrder.requisitionId,
        requisitionStatus: 'PO_ISSUED',
      },
    });

    return purchaseOrder;
  }

  private createPoNumber() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');

    return `PO-${date}-${suffix}`;
  }
}
