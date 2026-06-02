import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { optionalText, requireText } from '../procurement.service-utils';

export type CreateReceiptInput = {
  organizationId: string;
  actorUserId?: string;
  purchaseOrderId: string;
  receivedAt?: string;
  notes?: string;
};

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateReceiptInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const purchaseOrderId = requireText(
      input.purchaseOrderId,
      'purchaseOrderId',
    );

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

    if (purchaseOrder.status !== 'ISSUED') {
      throw new BadRequestException(
        'Only issued purchase orders can be received',
      );
    }

    const receivedAt = input.receivedAt
      ? new Date(input.receivedAt)
      : new Date();

    if (Number.isNaN(receivedAt.getTime())) {
      throw new BadRequestException('receivedAt must be a valid date');
    }

    const receipt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.receipt.create({
        data: {
          organizationId,
          purchaseOrderId,
          receivedAt,
          notes: optionalText(input.notes),
        },
        include: {
          purchaseOrder: true,
        },
      });

      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: 'RECEIVED',
        },
      });

      await tx.requisition.update({
        where: { id: purchaseOrder.requisitionId },
        data: {
          status: 'RECEIVED',
        },
      });

      return created;
    });

    await this.auditEvents.create({
      organizationId: receipt.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'RECEIPT_RECORDED',
      entityType: 'Receipt',
      entityId: receipt.id,
      metadata: {
        purchaseOrderId: receipt.purchaseOrderId,
        poNumber: purchaseOrder.poNumber,
        requisitionStatus: 'RECEIVED',
      },
    });

    return receipt;
  }
}
