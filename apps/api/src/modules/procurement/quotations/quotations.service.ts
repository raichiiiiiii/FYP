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
  numericValue,
  optionalText,
  requireText,
  totalAmount,
} from '../procurement.service-utils';

const quotationInclude = {
  supplier: true,
  rfq: {
    include: {
      requisition: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  },
  items: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.QuotationInclude;

export type CreateQuotationInput = {
  organizationId: string;
  actorUserId?: string;
  rfqId: string;
  supplierId: string;
  items?: ProcurementLineItemInput[];
};

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateQuotationInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const rfqId = requireText(input.rfqId, 'rfqId');
    const supplierId = requireText(input.supplierId, 'supplierId');

    const [rfq, supplier] = await Promise.all([
      this.prisma.rFQ.findUnique({
        where: { id: rfqId },
        include: {
          items: true,
          requisition: true,
        },
      }),
      this.prisma.supplier.findUnique({
        where: { id: supplierId },
      }),
    ]);

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (rfq.organizationId !== organizationId) {
      throw new BadRequestException('RFQ does not belong to the organization');
    }

    if (supplier.organizationId !== organizationId) {
      throw new BadRequestException(
        'Supplier does not belong to the organization',
      );
    }

    if (rfq.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Only published RFQs can receive quotations',
      );
    }

    const sourceItems = input.items?.length
      ? input.items.map((item) => ({
          rfqItemId: optionalText(item.rfqItemId),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      : rfq.items.map((item) => ({
          rfqItemId: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.targetPrice ?? 0,
        }));

    const quotationItems = sourceItems.map((item, index) => ({
      rfqItemId: optionalText(item.rfqItemId),
      description: requireText(item.description, `items[${index}].description`),
      quantity: numericValue(item.quantity, `items[${index}].quantity`, 1),
      unitPrice: numericValue(item.unitPrice, `items[${index}].unitPrice`, 0),
    }));

    const quotation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          organizationId,
          rfqId,
          supplierId,
          totalAmount: totalAmount(quotationItems),
          items: {
            create: quotationItems.map((item) => ({
              rfqItemId: item.rfqItemId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: quotationInclude,
      });

      await tx.requisition.update({
        where: { id: rfq.requisitionId },
        data: {
          status: 'AWARDED',
        },
      });

      return created;
    });

    await this.auditEvents.create({
      organizationId: quotation.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'QUOTATION_RECEIVED',
      entityType: 'Quotation',
      entityId: quotation.id,
      metadata: {
        rfqId: quotation.rfqId,
        supplierId: quotation.supplierId,
        totalAmount: quotation.totalAmount,
        requisitionStatus: 'AWARDED',
      },
    });

    return quotation;
  }

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.quotation.findMany({
      where: {
        organizationId,
      },
      include: quotationInclude,
      orderBy: {
        receivedAt: 'desc',
      },
    });
  }
}
