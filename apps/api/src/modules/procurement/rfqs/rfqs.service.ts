import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { optionalText, requireText } from '../procurement.service-utils';

const rfqInclude = {
  requisition: {
    select: {
      id: true,
      title: true,
      status: true,
      totalAmount: true,
    },
  },
  items: {
    orderBy: {
      description: 'asc',
    },
  },
  quotations: {
    include: {
      supplier: true,
      items: true,
    },
    orderBy: {
      receivedAt: 'desc',
    },
  },
} satisfies Prisma.RFQInclude;

export type CreateRFQInput = {
  organizationId: string;
  actorUserId?: string;
  requisitionId: string;
  title?: string;
};

export type RFQTransitionInput = {
  actorUserId?: string;
};

@Injectable()
export class RFQsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateRFQInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const requisitionId = requireText(input.requisitionId, 'requisitionId');

    const requisition = await this.prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: {
        items: true,
      },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (requisition.organizationId !== organizationId) {
      throw new BadRequestException(
        'Requisition does not belong to the organization',
      );
    }

    if (requisition.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only approved requisitions can move to sourcing',
      );
    }

    const rfq = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rFQ.create({
        data: {
          organizationId,
          requisitionId,
          title: optionalText(input.title) || `RFQ for ${requisition.title}`,
          items: {
            create: requisition.items.map((item) => ({
              requisitionItemId: item.id,
              description: item.description,
              quantity: item.quantity,
              targetPrice: item.unitPrice,
            })),
          },
        },
        include: rfqInclude,
      });

      await tx.requisition.update({
        where: { id: requisitionId },
        data: {
          status: 'SOURCING',
        },
      });

      return created;
    });

    await this.auditEvents.create({
      organizationId: rfq.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'RFQ_CREATED',
      entityType: 'RFQ',
      entityId: rfq.id,
      metadata: {
        title: rfq.title,
        requisitionId: rfq.requisitionId,
        requisitionStatus: 'SOURCING',
      },
    });

    return rfq;
  }

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.rFQ.findMany({
      where: {
        organizationId,
      },
      include: rfqInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getById(id: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id },
      include: rfqInclude,
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    return rfq;
  }

  async publish(id: string, input: RFQTransitionInput) {
    const current = await this.prisma.rFQ.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('RFQ not found');
    }

    if (current.status !== 'DRAFT') {
      throw new BadRequestException('Only draft RFQs can be published');
    }

    const rfq = await this.prisma.rFQ.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      include: rfqInclude,
    });

    await this.auditEvents.create({
      organizationId: rfq.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'RFQ_PUBLISHED',
      entityType: 'RFQ',
      entityId: rfq.id,
      metadata: {
        title: rfq.title,
        status: rfq.status,
      },
    });

    return rfq;
  }
}
