import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  numericValue,
  optionalText,
  requireText,
} from '../procurement.service-utils';

export type CreateApprovalRuleInput = {
  organizationId: string;
  actorUserId?: string;
  name: string;
  minAmount?: number | string;
  maxAmount?: number | string;
  approverRoleCode?: string;
  requiresSegregation?: boolean;
  isActive?: boolean;
};

export type UpdateApprovalRuleInput = Partial<CreateApprovalRuleInput>;

@Injectable()
export class ProcurementOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  listApprovalTasks(organizationId?: string, actorUserId?: string) {
    const scopedOrganizationId = requireText(organizationId, 'organizationId');
    const scopedActorUserId = optionalText(actorUserId);

    return this.prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        requisition: {
          organizationId: scopedOrganizationId,
        },
        ...(scopedActorUserId
          ? {
              OR: [
                { approverUserId: scopedActorUserId },
                { approverUserId: null },
              ],
            }
          : {}),
      },
      include: {
        approverUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        requisition: {
          include: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  listApprovalRules(organizationId?: string) {
    const scopedOrganizationId = requireText(organizationId, 'organizationId');

    return this.prisma.procurementApprovalRule.findMany({
      where: {
        organizationId: scopedOrganizationId,
      },
      orderBy: [{ isActive: 'desc' }, { minAmount: 'asc' }],
    });
  }

  async createApprovalRule(input: CreateApprovalRuleInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const name = requireText(input.name, 'name');
    const maxAmount = this.optionalAmount(input.maxAmount, 'maxAmount');

    const rule = await this.prisma.procurementApprovalRule.create({
      data: {
        organizationId,
        name,
        minAmount: numericValue(input.minAmount, 'minAmount', 0),
        maxAmount,
        approverRoleCode: optionalText(input.approverRoleCode) || 'APPROVER',
        requiresSegregation: input.requiresSegregation ?? true,
        isActive: input.isActive ?? true,
      },
    });

    await this.auditEvents.create({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'APPROVAL_RULE_CREATED',
      entityType: 'ProcurementApprovalRule',
      entityId: rule.id,
      metadata: {
        name: rule.name,
        minAmount: rule.minAmount,
        maxAmount: rule.maxAmount,
        approverRoleCode: rule.approverRoleCode,
        requiresSegregation: rule.requiresSegregation,
      },
    });

    return rule;
  }

  async updateApprovalRule(id: string, input: UpdateApprovalRuleInput) {
    const current = await this.prisma.procurementApprovalRule.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Approval rule not found');
    }

    const rule = await this.prisma.procurementApprovalRule.update({
      where: { id },
      data: {
        name: input.name ? requireText(input.name, 'name') : undefined,
        minAmount:
          input.minAmount === undefined
            ? undefined
            : numericValue(input.minAmount, 'minAmount', 0),
        maxAmount:
          input.maxAmount === undefined
            ? undefined
            : this.optionalAmount(input.maxAmount, 'maxAmount'),
        approverRoleCode:
          input.approverRoleCode === undefined
            ? undefined
            : requireText(input.approverRoleCode, 'approverRoleCode'),
        requiresSegregation: input.requiresSegregation,
        isActive: input.isActive,
      },
    });

    await this.auditEvents.create({
      organizationId: rule.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'APPROVAL_RULE_UPDATED',
      entityType: 'ProcurementApprovalRule',
      entityId: rule.id,
      metadata: {
        name: rule.name,
        isActive: rule.isActive,
      },
    });

    return rule;
  }

  async getReceiptInvoiceMatching(organizationId?: string) {
    const scopedOrganizationId = requireText(organizationId, 'organizationId');

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId: scopedOrganizationId,
      },
      include: {
        supplier: true,
        requisition: {
          select: {
            id: true,
            title: true,
            status: true,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return purchaseOrders.map((purchaseOrder) => {
      const invoiceTotal = purchaseOrder.invoices.reduce(
        (total, invoice) => total + invoice.amount,
        0,
      );
      const hasReceipts = purchaseOrder.receipts.length > 0;
      const hasInvoices = purchaseOrder.invoices.length > 0;
      const amountMatches =
        hasInvoices &&
        Math.abs(invoiceTotal - purchaseOrder.totalAmount) < 0.01;

      return {
        purchaseOrder,
        receiptCount: purchaseOrder.receipts.length,
        invoiceCount: purchaseOrder.invoices.length,
        invoiceTotal,
        amountMatches,
        matchingStatus: this.matchingStatus(
          hasReceipts,
          hasInvoices,
          amountMatches,
        ),
      };
    });
  }

  private optionalAmount(value: number | string | undefined, field: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const amount = numericValue(value, field, 0);

    if (amount <= 0) {
      throw new BadRequestException(`${field} must be greater than zero`);
    }

    return amount;
  }

  private matchingStatus(
    hasReceipts: boolean,
    hasInvoices: boolean,
    amountMatches: boolean,
  ) {
    if (!hasReceipts) {
      return 'RECEIPT_PENDING';
    }

    if (!hasInvoices) {
      return 'INVOICE_PENDING';
    }

    return amountMatches ? 'MATCHED' : 'AMOUNT_MISMATCH';
  }
}
