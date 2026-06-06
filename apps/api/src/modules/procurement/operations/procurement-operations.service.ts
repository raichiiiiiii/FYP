import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  buildReviewReadiness,
  canReadProcurementSummary,
  summarySeverityForCount,
  type ProcurementSummaryDto,
  type QueueItemDto,
  type SummaryMetricDto,
  type WorkflowBlockerDto,
} from '../../summary/summary-contract';
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

  async getSummary(
    organizationId?: string,
    roleCodes: readonly string[] = [],
  ): Promise<ProcurementSummaryDto> {
    const scopedOrganizationId = requireText(organizationId, 'organizationId');

    if (!canReadProcurementSummary(roleCodes)) {
      throw new ForbiddenException(
        'User role cannot access procurement summary',
      );
    }

    const [
      projectCount,
      supplierCount,
      requisitionCount,
      pendingApprovalCount,
      submittedRequisitionCount,
      rfqCount,
      openRfqCount,
      quotationCount,
      purchaseOrderCount,
      receiptCount,
      invoiceCount,
      statusGroups,
      matchingRecords,
    ] = await Promise.all([
      this.prisma.project.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.supplier.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.requisition.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.approvalRequest.count({
        where: {
          status: 'PENDING',
          requisition: { organizationId: scopedOrganizationId },
        },
      }),
      this.prisma.requisition.count({
        where: {
          organizationId: scopedOrganizationId,
          status: { in: ['SUBMITTED', 'PENDING'] },
        },
      }),
      this.prisma.rFQ.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.rFQ.count({
        where: {
          organizationId: scopedOrganizationId,
          status: 'PUBLISHED',
        },
      }),
      this.prisma.quotation.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.purchaseOrder.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.receipt.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.invoice.count({
        where: { organizationId: scopedOrganizationId },
      }),
      this.prisma.requisition.groupBy({
        by: ['status'],
        where: { organizationId: scopedOrganizationId },
        _count: { _all: true },
      }),
      this.getReceiptInvoiceMatching(scopedOrganizationId),
    ]);

    const matchingExceptionCount = matchingRecords.filter(
      (record) => record.matchingStatus !== 'MATCHED',
    ).length;
    const statusBreakdown = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    );

    return {
      organizationId: scopedOrganizationId,
      generatedAt: new Date().toISOString(),
      metrics: procurementMetrics({
        projectCount,
        supplierCount,
        requisitionCount,
        pendingApprovalCount,
        rfqCount,
        openRfqCount,
        quotationCount,
        purchaseOrderCount,
        receiptCount,
        invoiceCount,
        matchingExceptionCount,
      }),
      queue: procurementQueue({
        pendingApprovalCount,
        submittedRequisitionCount,
        openRfqCount,
        matchingExceptionCount,
      }),
      blockers: procurementBlockers({
        pendingApprovalCount,
        matchingExceptionCount,
      }),
      readiness: [
        buildReviewReadiness({
          id: 'procurement-approval-readiness',
          area: 'procurement',
          label: 'Approval readiness',
          ready: requisitionCount - pendingApprovalCount,
          total: requisitionCount,
          targetRoute: '/procurement/approvals',
        }),
        buildReviewReadiness({
          id: 'procurement-matching-readiness',
          area: 'procurement',
          label: 'Receipt/invoice matching',
          ready: purchaseOrderCount - matchingExceptionCount,
          total: purchaseOrderCount,
          targetRoute: '/procurement/matching',
        }),
      ],
      statusBreakdown,
    };
  }

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

function procurementMetrics(counts: {
  projectCount: number;
  supplierCount: number;
  requisitionCount: number;
  pendingApprovalCount: number;
  rfqCount: number;
  openRfqCount: number;
  quotationCount: number;
  purchaseOrderCount: number;
  receiptCount: number;
  invoiceCount: number;
  matchingExceptionCount: number;
}): SummaryMetricDto[] {
  return [
    {
      id: 'procurement-projects',
      label: 'Procurement projects',
      value: counts.projectCount,
      helper: 'Projects with procurement records in this organization.',
      severity: 'neutral',
      targetRoute: '/procurement/projects',
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      value: counts.supplierCount,
      helper: 'Active supplier records available to sourcing workflows.',
      severity: counts.supplierCount > 0 ? 'success' : 'warning',
      targetRoute: '/procurement/suppliers',
    },
    {
      id: 'requisitions',
      label: 'Requisitions',
      value: counts.requisitionCount,
      helper: `${counts.pendingApprovalCount} approval item(s) pending.`,
      severity: summarySeverityForCount(counts.pendingApprovalCount, {
        warning: 1,
        danger: 5,
      }),
      targetRoute: '/procurement/requisitions',
    },
    {
      id: 'sourcing',
      label: 'RFQs and quotations',
      value: counts.rfqCount + counts.quotationCount,
      helper: `${counts.openRfqCount} RFQ(s) published for supplier response.`,
      severity: summarySeverityForCount(counts.openRfqCount, {
        warning: 1,
        danger: 5,
      }),
      targetRoute: '/procurement/rfqs',
    },
    {
      id: 'purchase-orders',
      label: 'Purchase orders',
      value: counts.purchaseOrderCount,
      helper: `${counts.receiptCount} receipt(s), ${counts.invoiceCount} invoice(s).`,
      severity: 'neutral',
      targetRoute: '/procurement/purchase-orders',
    },
    {
      id: 'matching-exceptions',
      label: 'Matching exceptions',
      value: counts.matchingExceptionCount,
      helper:
        'Receipt and invoice records that do not yet fully match the purchase order.',
      severity: summarySeverityForCount(counts.matchingExceptionCount, {
        warning: 1,
        danger: 3,
      }),
      targetRoute: '/procurement/matching',
    },
  ];
}

function procurementQueue(counts: {
  pendingApprovalCount: number;
  submittedRequisitionCount: number;
  openRfqCount: number;
  matchingExceptionCount: number;
}): QueueItemDto[] {
  const queue: QueueItemDto[] = [];

  if (counts.pendingApprovalCount > 0) {
    queue.push({
      id: 'pending-approval-queue',
      area: 'procurement',
      title: 'Review pending approvals',
      description: `${counts.pendingApprovalCount} requisition approval task(s) are waiting.`,
      count: counts.pendingApprovalCount,
      priority: 'high',
      status: 'open',
      targetRoute: '/procurement/approvals',
    });
  }

  if (counts.submittedRequisitionCount > 0) {
    queue.push({
      id: 'submitted-requisition-queue',
      area: 'procurement',
      title: 'Advance submitted requisitions',
      description: `${counts.submittedRequisitionCount} submitted requisition(s) need sourcing or approval action.`,
      count: counts.submittedRequisitionCount,
      priority: 'medium',
      status: 'open',
      targetRoute: '/procurement/requisitions',
    });
  }

  if (counts.openRfqCount > 0) {
    queue.push({
      id: 'open-rfq-queue',
      area: 'procurement',
      title: 'Monitor open RFQs',
      description: `${counts.openRfqCount} published RFQ(s) are awaiting quotations.`,
      count: counts.openRfqCount,
      priority: 'medium',
      status: 'pending_external',
      targetRoute: '/procurement/rfqs',
    });
  }

  if (counts.matchingExceptionCount > 0) {
    queue.push({
      id: 'matching-exception-queue',
      area: 'procurement',
      title: 'Resolve matching exceptions',
      description: `${counts.matchingExceptionCount} purchase order(s) need receipt or invoice matching.`,
      count: counts.matchingExceptionCount,
      priority: 'high',
      status: 'blocked',
      targetRoute: '/procurement/matching',
    });
  }

  if (!queue.length) {
    queue.push({
      id: 'procurement-empty-queue',
      area: 'procurement',
      title: 'No urgent procurement work',
      description: 'Backend records do not show pending procurement action.',
      count: 0,
      priority: 'low',
      status: 'done',
      targetRoute: '/procurement',
    });
  }

  return queue;
}

function procurementBlockers(counts: {
  pendingApprovalCount: number;
  matchingExceptionCount: number;
}): WorkflowBlockerDto[] {
  const blockers: WorkflowBlockerDto[] = [];

  if (counts.matchingExceptionCount > 0) {
    blockers.push({
      id: 'procurement-matching-exceptions',
      area: 'procurement',
      title: 'Receipt or invoice mismatch',
      description:
        'One or more purchase orders are missing receipts, invoices, or amount agreement.',
      count: counts.matchingExceptionCount,
      severity: 'warning',
      requiredAction:
        'Open procurement matching and resolve receipt/invoice gaps.',
      targetRoute: '/procurement/matching',
    });
  }

  if (counts.pendingApprovalCount >= 5) {
    blockers.push({
      id: 'procurement-approval-backlog',
      area: 'procurement',
      title: 'Approval backlog',
      description: 'Approval queue has reached the dashboard danger threshold.',
      count: counts.pendingApprovalCount,
      severity: 'danger',
      requiredAction: 'Assign approvers or clear pending approval tasks.',
      targetRoute: '/procurement/approvals',
    });
  }

  return blockers;
}
