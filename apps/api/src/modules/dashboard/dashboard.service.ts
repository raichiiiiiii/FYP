import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  buildReviewReadiness,
  canReadFinanceSummary,
  canReadProcurementSummary,
  summarySeverityForCount,
  type QueueItemDto,
  type ReviewReadinessDto,
  type SummaryMetricDto,
  type SummarySeverity,
  type WorkflowBlockerDto,
} from '../summary/summary-contract';

type DashboardRole =
  | 'sme_admin'
  | 'procurement_officer'
  | 'approver'
  | 'supplier'
  | 'finance'
  | 'financier'
  | 'shariah_reviewer'
  | 'auditor'
  | 'developer';

type DashboardVisibility = {
  procurement: boolean;
  finance: boolean;
  operations: boolean;
};

const rolePriority: DashboardRole[] = [
  'sme_admin',
  'procurement_officer',
  'approver',
  'supplier',
  'finance',
  'financier',
  'shariah_reviewer',
  'auditor',
  'developer',
];

const roleMap: Record<string, DashboardRole> = {
  ORG_ADMIN: 'sme_admin',
  PROCUREMENT_OFFICER: 'procurement_officer',
  RECEIVING_OFFICER: 'procurement_officer',
  APPROVER: 'approver',
  APPROVER_MANAGER: 'approver',
  SUPPLIER_USER: 'supplier',
  SUPPLIER_SALES: 'supplier',
  MUDARIB_OPERATOR: 'supplier',
  SUPPLIER_FINANCE: 'finance',
  EVIDENCE_SUBMITTER: 'supplier',
  FINANCE_ACCOUNTANT: 'finance',
  FINANCIER_USER: 'financier',
  INVESTMENT_OFFICER: 'financier',
  RISK_REVIEWER: 'financier',
  DISBURSEMENT_OFFICER: 'financier',
  FINANCIER_AUDIT_VIEWER: 'auditor',
  SHARIAH_REVIEWER: 'shariah_reviewer',
  COMPLIANCE_REVIEWER: 'shariah_reviewer',
  CONTRACT_REVIEWER: 'shariah_reviewer',
  AUDITOR: 'auditor',
  AUDIT_VIEWER: 'auditor',
  REGULATOR_REVIEWER: 'auditor',
  READ_ONLY_EVIDENCE_VIEWER: 'auditor',
  DEVELOPER_INTEGRATOR: 'developer',
  ERP_INTEGRATOR: 'developer',
  API_CLIENT_MANAGER: 'developer',
  FABRIC_GOVERNANCE_ADMIN: 'sme_admin',
  PLATFORM_OPERATOR: 'developer',
  FABRIC_OPERATOR: 'developer',
  SUPPORT_OPERATOR: 'developer',
  SECURITY_OPERATOR: 'developer',
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(input: { organizationId?: string; roleCodes: string[] }) {
    const organizationId = input.organizationId?.trim();

    if (!organizationId) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    const role = resolveDashboardRole(input.roleCodes);
    const [
      projectCount,
      requisitionCount,
      pendingRequisitionCount,
      opportunityCount,
      applicationCount,
      submittedApplications,
      pendingOutboxCount,
      failedOutboxCount,
      auditEventCount,
      recentAuditEvents,
      fabricPendingAnchorCount,
      fabricFailedAnchorCount,
      unresolvedLossExceptionCount,
    ] = await Promise.all([
      this.prisma.project.count({ where: { organizationId } }),
      this.prisma.requisition.count({ where: { organizationId } }),
      this.prisma.requisition.count({
        where: { organizationId, status: { in: ['SUBMITTED', 'PENDING'] } },
      }),
      this.prisma.procurementOpportunity.count({ where: { organizationId } }),
      this.prisma.mudarabahApplication.count({ where: { organizationId } }),
      this.prisma.mudarabahApplication.count({
        where: {
          organizationId,
          status: {
            in: [
              'SUBMITTED',
              'EVIDENCE_PENDING',
              'DUE_DILIGENCE_IN_REVIEW',
              'SHARIAH_IN_REVIEW',
            ],
          },
        },
      }),
      this.prisma.outboxEvent.count({
        where: { organizationId, status: 'PENDING' },
      }),
      this.prisma.outboxEvent.count({
        where: { organizationId, status: 'FAILED' },
      }),
      this.prisma.auditEvent.count({ where: { organizationId } }),
      this.prisma.auditEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.auditAnchor.count({
        where: {
          organizationId,
          anchorType: 'FABRIC',
          status: { in: ['PENDING', 'ANCHOR_REQUESTED'] },
        },
      }),
      this.prisma.auditAnchor.count({
        where: {
          organizationId,
          anchorType: 'FABRIC',
          status: 'FAILED',
        },
      }),
      this.prisma.lossException.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'UNDER_REVIEW', 'CLASSIFIED'] },
        },
      }),
    ]);
    const visibility = visibilityFor(input.roleCodes, role);
    const metrics = metricsFor({
      visibility,
      projectCount,
      requisitionCount,
      pendingRequisitionCount,
      applicationCount,
      submittedApplications,
      auditEventCount,
      pendingOutboxCount,
      failedOutboxCount,
    });
    const queue = queueFor(role, visibility, {
      pendingRequisitionCount,
      submittedApplications,
      failedOutboxCount,
      opportunityCount,
      unresolvedLossExceptionCount,
      fabricPendingAnchorCount,
    });
    const blockers = blockersFor(visibility, {
      failedOutboxCount,
      fabricFailedAnchorCount,
      unresolvedLossExceptionCount,
    });
    const readiness = readinessFor(visibility, {
      pendingRequisitionCount,
      requisitionCount,
      submittedApplications,
      applicationCount,
      unresolvedLossExceptionCount,
      fabricPendingAnchorCount,
      fabricFailedAnchorCount,
    });
    const signals = signalsFor(visibility, {
      pendingOutboxCount,
      failedOutboxCount,
      recentAuditEventCount: recentAuditEvents.length,
    });
    const filteredAuditEvents = recentAuditEvents.filter((event) =>
      canSeeAuditEntity(event.entityType, visibility),
    );

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      role,
      title: titleFor(role),
      subtitle: subtitleFor(role),
      metrics,
      queue,
      blockers,
      readiness,
      kpis: metrics,
      tasks: queue.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        targetRoute: item.targetRoute,
        priority: item.priority,
        status: item.status,
      })),
      signals,
      activities: filteredAuditEvents.map((event) => ({
        id: event.id,
        title: event.eventType,
        description:
          `${event.entityType ?? 'System'} ${event.entityId ?? ''}`.trim(),
        eventType: event.eventType,
        occurredAt: event.createdAt.toISOString(),
        targetRoute:
          event.entityType && event.entityId
            ? `/audit/entity/${event.entityType}/${event.entityId}`
            : '/audit/search',
      })),
    };
  }
}

function resolveDashboardRole(roleCodes: string[]): DashboardRole {
  const roles = roleCodes.map((roleCode) => roleMap[roleCode]);

  return (
    rolePriority.find((role) => roles.includes(role)) ?? 'procurement_officer'
  );
}

function visibilityFor(
  roleCodes: readonly string[],
  role: DashboardRole,
): DashboardVisibility {
  return {
    procurement:
      canReadProcurementSummary(roleCodes) ||
      ['sme_admin', 'procurement_officer', 'approver', 'auditor'].includes(
        role,
      ),
    finance:
      canReadFinanceSummary(roleCodes) ||
      [
        'sme_admin',
        'finance',
        'financier',
        'shariah_reviewer',
        'auditor',
      ].includes(role),
    operations: ['sme_admin', 'auditor', 'developer'].includes(role),
  };
}

function titleFor(role: DashboardRole) {
  return (
    {
      sme_admin: 'Organization cockpit',
      procurement_officer: 'Procurement cockpit',
      approver: 'Approval cockpit',
      supplier: 'Supplier workspace',
      finance: 'Finance operations cockpit',
      financier: 'Financier review cockpit',
      shariah_reviewer: 'Shariah review cockpit',
      auditor: 'Audit cockpit',
      developer: 'Integration cockpit',
    } satisfies Record<DashboardRole, string>
  )[role];
}

function subtitleFor(role: DashboardRole) {
  return (
    {
      sme_admin:
        'Setup readiness, user access, integration health, and audit-sensitive operations.',
      procurement_officer:
        'Procurement workload, requisition progress, evidence, and sourcing visibility.',
      approver: 'Approval queue and procurement exception review.',
      supplier: 'Supplier-side procurement activity and evidence requests.',
      finance: 'Project finance evidence, ledger, and closure workload.',
      financier:
        'Restricted mudarabah application review and contract readiness.',
      shariah_reviewer:
        'Shariah/compliance review queue and audit-sensitive evidence.',
      auditor:
        'Audit, hash, and integration evidence requiring independent review.',
      developer: 'Adapter, outbox, health, and deployment operational status.',
    } satisfies Record<DashboardRole, string>
  )[role];
}

function metricsFor(counts: {
  visibility: DashboardVisibility;
  projectCount: number;
  requisitionCount: number;
  pendingRequisitionCount: number;
  applicationCount: number;
  submittedApplications: number;
  auditEventCount: number;
  pendingOutboxCount: number;
  failedOutboxCount: number;
}): SummaryMetricDto[] {
  const metrics: SummaryMetricDto[] = [
    {
      id: 'projects',
      label: 'Active projects',
      value: counts.projectCount,
      helper: 'Backend project records scoped to this organization.',
      severity: 'neutral',
      targetRoute: '/procurement/projects',
    },
    {
      id: 'audit-events',
      label: 'Audit events',
      value: counts.auditEventCount,
      helper: 'Append-only local audit trail.',
      severity: 'success',
      targetRoute: '/audit/search',
    },
  ];

  if (counts.visibility.procurement) {
    metrics.push({
      id: 'requisitions',
      label: 'Requisitions',
      value: counts.requisitionCount,
      helper: `${counts.pendingRequisitionCount} waiting for review or sourcing.`,
      severity: summarySeverityForCount(counts.pendingRequisitionCount, {
        warning: 1,
        danger: 5,
      }),
      targetRoute: '/procurement',
    });
  }

  if (counts.visibility.finance) {
    metrics.push({
      id: 'applications',
      label: 'Applications',
      value: counts.applicationCount,
      helper: `${counts.submittedApplications} in review-sensitive states.`,
      severity: summarySeverityForCount(counts.submittedApplications, {
        warning: 1,
        danger: 5,
      }),
      targetRoute: '/finance/applications',
    });
  }

  if (counts.visibility.operations) {
    metrics.push({
      id: 'outbox-backlog',
      label: 'Outbox backlog',
      value: counts.pendingOutboxCount + counts.failedOutboxCount,
      helper: 'Pending and failed asynchronous adapter work.',
      severity: summarySeverityForCount(counts.failedOutboxCount, {
        warning: 1,
        danger: 3,
      }),
      targetRoute: '/integrations',
    });
  }

  return metrics;
}

function queueFor(
  role: DashboardRole,
  visibility: DashboardVisibility,
  counts: {
    pendingRequisitionCount: number;
    submittedApplications: number;
    failedOutboxCount: number;
    opportunityCount: number;
    unresolvedLossExceptionCount: number;
    fabricPendingAnchorCount: number;
  },
) {
  const tasks: QueueItemDto[] = [];

  if (visibility.operations && counts.failedOutboxCount > 0) {
    tasks.push({
      id: 'review-failed-outbox',
      area: 'dashboard',
      title: 'Review failed integration work',
      description:
        'Failed outbox items may affect audit, Fabric, e-signature, or webhook visibility.',
      count: counts.failedOutboxCount,
      targetRoute: '/integrations',
      priority: 'critical',
      status: 'open',
    });
  }

  if (visibility.procurement && counts.pendingRequisitionCount > 0) {
    tasks.push({
      id: 'review-procurement-queue',
      area: 'procurement',
      title: 'Review procurement queue',
      description: `${counts.pendingRequisitionCount} requisition item(s) need attention.`,
      count: counts.pendingRequisitionCount,
      targetRoute: '/procurement',
      priority: role === 'procurement_officer' ? 'high' : 'medium',
      status: 'open',
    });
  }

  if (visibility.finance && counts.submittedApplications > 0) {
    tasks.push({
      id: 'review-finance-applications',
      area: 'finance',
      title: 'Review finance applications',
      description: `${counts.submittedApplications} application(s) are in review-sensitive states.`,
      count: counts.submittedApplications,
      targetRoute: '/finance/applications',
      priority:
        role === 'financier' || role === 'shariah_reviewer' ? 'high' : 'medium',
      status: 'open',
    });
  }

  if (visibility.finance && counts.unresolvedLossExceptionCount > 0) {
    tasks.push({
      id: 'review-loss-exceptions',
      area: 'finance',
      title: 'Resolve loss exception review',
      description: `${counts.unresolvedLossExceptionCount} loss exception item(s) need reviewer decision or resolution.`,
      count: counts.unresolvedLossExceptionCount,
      targetRoute: '/finance/applications',
      priority: 'high',
      status: 'blocked',
    });
  }

  if (visibility.operations && counts.fabricPendingAnchorCount > 0) {
    tasks.push({
      id: 'review-pending-fabric-anchors',
      area: 'dashboard',
      title: 'Monitor pending Fabric anchors',
      description: `${counts.fabricPendingAnchorCount} real Fabric anchor request(s) are still pending.`,
      count: counts.fabricPendingAnchorCount,
      targetRoute: '/integrations',
      priority: 'medium',
      status: 'pending_external',
    });
  }

  if (!tasks.length) {
    tasks.push({
      id: 'review-dashboard-empty',
      area: 'dashboard',
      title: 'Review current records',
      description:
        visibility.finance && counts.opportunityCount > 0
          ? 'Finance opportunities exist; open the pipeline for details.'
          : 'No urgent backend-backed tasks are currently visible.',
      count: 0,
      targetRoute:
        visibility.finance && counts.opportunityCount > 0
          ? '/finance/opportunities'
          : '/audit/search',
      priority: 'low',
      status: 'open',
    });
  }

  return tasks;
}

function blockersFor(
  visibility: DashboardVisibility,
  counts: {
    failedOutboxCount: number;
    fabricFailedAnchorCount: number;
    unresolvedLossExceptionCount: number;
  },
): WorkflowBlockerDto[] {
  const blockers: WorkflowBlockerDto[] = [];

  if (visibility.operations && counts.failedOutboxCount > 0) {
    blockers.push({
      id: 'failed-outbox',
      area: 'dashboard',
      title: 'Failed async integration work',
      description:
        'At least one outbox item failed and may require retry or operator review.',
      count: counts.failedOutboxCount,
      severity: 'danger',
      requiredAction: 'Open integrations and inspect failed outbox items.',
      targetRoute: '/integrations',
    });
  }

  if (visibility.operations && counts.fabricFailedAnchorCount > 0) {
    blockers.push({
      id: 'failed-fabric-anchors',
      area: 'dashboard',
      title: 'Failed Fabric anchor requests',
      description:
        'Real Fabric anchor requests failed. These are not verified on-chain proof.',
      count: counts.fabricFailedAnchorCount,
      severity: 'danger',
      requiredAction: 'Open integrations and review Fabric gateway failures.',
      targetRoute: '/integrations',
    });
  }

  if (visibility.finance && counts.unresolvedLossExceptionCount > 0) {
    blockers.push({
      id: 'unresolved-loss-exceptions',
      area: 'finance',
      title: 'Unresolved loss exceptions',
      description:
        'Closure remains blocked until reviewer decisions resolve open loss exceptions.',
      count: counts.unresolvedLossExceptionCount,
      severity: 'warning',
      requiredAction:
        'Open finance workspace and complete reviewer classification.',
      targetRoute: '/finance/applications',
    });
  }

  return blockers;
}

function readinessFor(
  visibility: DashboardVisibility,
  counts: {
    pendingRequisitionCount: number;
    requisitionCount: number;
    submittedApplications: number;
    applicationCount: number;
    unresolvedLossExceptionCount: number;
    fabricPendingAnchorCount: number;
    fabricFailedAnchorCount: number;
  },
): ReviewReadinessDto[] {
  const readiness: ReviewReadinessDto[] = [];

  if (visibility.procurement) {
    readiness.push(
      buildReviewReadiness({
        id: 'procurement-approvals',
        area: 'procurement',
        label: 'Procurement approvals',
        ready: counts.requisitionCount - counts.pendingRequisitionCount,
        total: counts.requisitionCount,
        targetRoute: '/procurement',
      }),
    );
  }

  if (visibility.finance) {
    readiness.push(
      buildReviewReadiness({
        id: 'finance-application-review',
        area: 'finance',
        label: 'Finance application review',
        ready: counts.applicationCount - counts.submittedApplications,
        total: counts.applicationCount,
        targetRoute: '/finance/applications',
      }),
      buildReviewReadiness({
        id: 'loss-exception-resolution',
        area: 'finance',
        label: 'Loss exception resolution',
        ready: counts.unresolvedLossExceptionCount > 0 ? 0 : 1,
        total: counts.unresolvedLossExceptionCount > 0 ? 1 : 0,
        targetRoute: '/finance/applications',
      }),
    );
  }

  if (visibility.operations) {
    const openFabricIssues =
      counts.fabricPendingAnchorCount + counts.fabricFailedAnchorCount;
    readiness.push(
      buildReviewReadiness({
        id: 'fabric-anchor-readiness',
        area: 'dashboard',
        label: 'Fabric anchor queue',
        ready: openFabricIssues > 0 ? 0 : 1,
        total: openFabricIssues > 0 ? 1 : 0,
        targetRoute: '/integrations',
      }),
    );
  }

  return readiness;
}

function signalsFor(
  visibility: DashboardVisibility,
  counts: {
    pendingOutboxCount: number;
    failedOutboxCount: number;
    recentAuditEventCount: number;
  },
) {
  const signals: Array<{
    id: string;
    label: string;
    value: number;
    description: string;
    severity: SummarySeverity;
    targetRoute: string;
  }> = [
    {
      id: 'audit-recent',
      label: 'Recent audit events',
      value: counts.recentAuditEventCount,
      description: 'Recent material actions are available in audit search.',
      severity: 'neutral',
      targetRoute: '/audit/search',
    },
  ];

  if (visibility.operations) {
    signals.unshift(
      {
        id: 'outbox-pending',
        label: 'Outbox pending',
        value: counts.pendingOutboxCount,
        description:
          'Pending adapter work is visible here. Pending Fabric work is not verified proof.',
        severity: counts.pendingOutboxCount > 0 ? 'warning' : 'success',
        targetRoute: '/integrations',
      },
      {
        id: 'outbox-failed',
        label: 'Outbox failed',
        value: counts.failedOutboxCount,
        description:
          'Failed adapter work requires operator review before external state can be trusted.',
        severity: counts.failedOutboxCount > 0 ? 'danger' : 'success',
        targetRoute: '/integrations',
      },
    );
  }

  return signals;
}

function canSeeAuditEntity(
  entityType: string | null,
  visibility: DashboardVisibility,
) {
  if (!entityType) {
    return true;
  }

  if (visibility.procurement && procurementAuditEntityTypes.has(entityType)) {
    return true;
  }

  if (visibility.finance && financeAuditEntityTypes.has(entityType)) {
    return true;
  }

  if (visibility.operations && operationsAuditEntityTypes.has(entityType)) {
    return true;
  }

  return !knownRestrictedAuditEntityTypes.has(entityType);
}

const procurementAuditEntityTypes = new Set([
  'Project',
  'Supplier',
  'Requisition',
  'RFQ',
  'Quotation',
  'PurchaseOrder',
  'Receipt',
  'Invoice',
]);

const financeAuditEntityTypes = new Set([
  'ProcurementOpportunity',
  'MudarabahApplication',
  'EvidenceChecklist',
  'ShariahReview',
  'FinanceContract',
  'Disbursement',
  'ProjectLedger',
  'ProfitLossStatement',
  'ProfitDistribution',
  'ClosurePack',
  'LossException',
]);

const operationsAuditEntityTypes = new Set([
  'OutboxEvent',
  'AuditAnchor',
  'HashRecord',
  'WebhookDelivery',
  'IntegrationReconciliationRecord',
]);

const knownRestrictedAuditEntityTypes = new Set([
  ...procurementAuditEntityTypes,
  ...financeAuditEntityTypes,
  ...operationsAuditEntityTypes,
]);
