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

const requisitionInclude = {
  project: true,
  requesterUser: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
  items: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  approvalRequests: {
    include: {
      approverUser: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  rfqs: {
    include: {
      items: true,
      quotations: {
        include: {
          supplier: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  purchaseOrders: {
    include: {
      supplier: true,
      items: true,
      receipts: true,
      invoices: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
} satisfies Prisma.RequisitionInclude;

export type CreateRequisitionInput = {
  organizationId: string;
  actorUserId?: string;
  projectId?: string;
  requesterUserId?: string;
  title: string;
  justification?: string;
  items: ProcurementLineItemInput[];
};

export type RequisitionTransitionInput = {
  actorUserId?: string;
  approverUserId?: string;
  comment?: string;
};

@Injectable()
export class RequisitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateRequisitionInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const title = requireText(input.title, 'title');
    const items = normalizeLineItems(input.items || []);
    const computedTotal = totalAmount(items);

    const requisition = await this.prisma.requisition.create({
      data: {
        organizationId,
        projectId: optionalText(input.projectId),
        requesterUserId:
          optionalText(input.requesterUserId) ||
          optionalText(input.actorUserId),
        title,
        justification: optionalText(input.justification),
        totalAmount: computedTotal,
        items: {
          create: items.map((item) => ({
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: requisitionInclude,
    });

    await this.auditEvents.create({
      organizationId: requisition.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'REQUISITION_CREATED',
      entityType: 'Requisition',
      entityId: requisition.id,
      metadata: {
        title: requisition.title,
        status: requisition.status,
        totalAmount: requisition.totalAmount,
      },
    });

    return requisition;
  }

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.requisition.findMany({
      where: {
        organizationId,
      },
      include: requisitionInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getById(id: string) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      include: requisitionInclude,
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    return requisition;
  }

  async submit(id: string, input: RequisitionTransitionInput) {
    const current = await this.getById(id);

    if (current.status !== 'DRAFT') {
      throw new BadRequestException('Only draft requisitions can be submitted');
    }

    const submitted = await this.prisma.$transaction(async (tx) => {
      await tx.approvalRequest.create({
        data: {
          requisitionId: id,
          approverUserId: optionalText(input.approverUserId),
          status: 'PENDING',
          comment: optionalText(input.comment),
        },
      });

      return tx.requisition.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
        include: requisitionInclude,
      });
    });

    await this.auditEvents.create({
      organizationId: submitted.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'REQUISITION_SUBMITTED',
      entityType: 'Requisition',
      entityId: submitted.id,
      metadata: {
        title: submitted.title,
        status: submitted.status,
      },
    });

    return submitted;
  }

  async approve(id: string, input: RequisitionTransitionInput) {
    const current = await this.getById(id);
    const approverUserId =
      optionalText(input.approverUserId) || optionalText(input.actorUserId);

    if (current.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted requisitions can be approved',
      );
    }

    if (
      approverUserId &&
      current.requesterUserId &&
      current.requesterUserId === approverUserId
    ) {
      throw new BadRequestException(
        'Requester cannot approve their own requisition',
      );
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const approvalRequest = await tx.approvalRequest.findFirst({
        where: {
          requisitionId: id,
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (approvalRequest) {
        await tx.approvalRequest.update({
          where: { id: approvalRequest.id },
          data: {
            approverUserId: approverUserId || approvalRequest.approverUserId,
            status: 'APPROVED',
            decision: 'APPROVED',
            comment: optionalText(input.comment),
            decidedAt: new Date(),
          },
        });
      } else {
        await tx.approvalRequest.create({
          data: {
            requisitionId: id,
            approverUserId,
            status: 'APPROVED',
            decision: 'APPROVED',
            comment: optionalText(input.comment),
            decidedAt: new Date(),
          },
        });
      }

      return tx.requisition.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
        include: requisitionInclude,
      });
    });

    await this.auditEvents.create({
      organizationId: approved.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'REQUISITION_APPROVED',
      entityType: 'Requisition',
      entityId: approved.id,
      metadata: {
        title: approved.title,
        status: approved.status,
        totalAmount: approved.totalAmount,
      },
    });

    return approved;
  }

  async reject(id: string, input: RequisitionTransitionInput) {
    const current = await this.getById(id);

    if (current.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted requisitions can be rejected',
      );
    }

    const rejected = await this.prisma.$transaction(async (tx) => {
      const approvalRequest = await tx.approvalRequest.findFirst({
        where: {
          requisitionId: id,
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (approvalRequest) {
        await tx.approvalRequest.update({
          where: { id: approvalRequest.id },
          data: {
            approverUserId:
              optionalText(input.approverUserId) ||
              approvalRequest.approverUserId,
            status: 'REJECTED',
            decision: 'REJECTED',
            comment: optionalText(input.comment),
            decidedAt: new Date(),
          },
        });
      }

      return tx.requisition.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
        },
        include: requisitionInclude,
      });
    });

    await this.auditEvents.create({
      organizationId: rejected.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'REQUISITION_REJECTED',
      entityType: 'Requisition',
      entityId: rejected.id,
      metadata: {
        title: rejected.title,
        status: rejected.status,
      },
    });

    return rejected;
  }
}
