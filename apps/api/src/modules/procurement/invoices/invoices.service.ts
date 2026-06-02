import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { numericValue, requireText } from '../procurement.service-utils';

export type CreateInvoiceInput = {
  organizationId: string;
  actorUserId?: string;
  purchaseOrderId: string;
  invoiceNumber: string;
  amount?: number | string;
  issuedAt?: string;
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateInvoiceInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const purchaseOrderId = requireText(
      input.purchaseOrderId,
      'purchaseOrderId',
    );
    const invoiceNumber = requireText(input.invoiceNumber, 'invoiceNumber');

    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.organizationId !== organizationId) {
      throw new BadRequestException(
        'Purchase order does not belong to the organization',
      );
    }

    if (purchaseOrder.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Only received purchase orders can be invoiced',
      );
    }

    const issuedAt = input.issuedAt ? new Date(input.issuedAt) : new Date();

    if (Number.isNaN(issuedAt.getTime())) {
      throw new BadRequestException('issuedAt must be a valid date');
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          organizationId,
          purchaseOrderId,
          supplierId: purchaseOrder.supplierId,
          invoiceNumber,
          amount: numericValue(
            input.amount,
            'amount',
            purchaseOrder.totalAmount,
          ),
          issuedAt,
        },
        include: {
          purchaseOrder: true,
          supplier: true,
        },
      });

      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: 'INVOICED',
        },
      });

      await tx.requisition.update({
        where: { id: purchaseOrder.requisitionId },
        data: {
          status: 'CLOSED',
        },
      });

      return created;
    });

    await this.auditEvents.create({
      organizationId: invoice.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'INVOICE_RECORDED',
      entityType: 'Invoice',
      entityId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        purchaseOrderId: invoice.purchaseOrderId,
        poNumber: purchaseOrder.poNumber,
        amount: invoice.amount,
        purchaseOrderStatus: 'INVOICED',
        requisitionStatus: 'CLOSED',
      },
    });

    return invoice;
  }
}
