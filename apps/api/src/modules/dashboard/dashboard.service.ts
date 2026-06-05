import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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

type DashboardTask = {
  id: string;
  title: string;
  description: string;
  targetRoute: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'blocked' | 'pending_external' | 'done';
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
  APPROVER: 'approver',
  SUPPLIER_USER: 'supplier',
  FINANCE_ACCOUNTANT: 'finance',
  FINANCIER_USER: 'financier',
  SHARIAH_REVIEWER: 'shariah_reviewer',
  AUDITOR: 'auditor',
  DEVELOPER_INTEGRATOR: 'developer',
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
    ]);

    return {
      role,
      title: titleFor(role),
      subtitle: subtitleFor(role),
      kpis: [
        {
          id: 'projects',
          label: 'Active projects',
          value: projectCount,
          helper: 'Backend project records scoped to this organization.',
          severity: 'neutral',
        },
        {
          id: 'requisitions',
          label: 'Requisitions',
          value: requisitionCount,
          helper: `${pendingRequisitionCount} waiting for review or sourcing.`,
          severity: pendingRequisitionCount > 0 ? 'warning' : 'success',
        },
        {
          id: 'applications',
          label: 'Applications',
          value: applicationCount,
          helper: `${submittedApplications} in review-sensitive states.`,
          severity: submittedApplications > 0 ? 'warning' : 'neutral',
        },
        {
          id: 'audit-events',
          label: 'Audit events',
          value: auditEventCount,
          helper: 'Append-only local audit trail.',
          severity: 'success',
        },
      ],
      tasks: tasksFor(role, {
        pendingRequisitionCount,
        submittedApplications,
        failedOutboxCount,
        opportunityCount,
      }),
      signals: [
        {
          id: 'outbox-pending',
          label: 'Outbox pending',
          value: pendingOutboxCount,
          description:
            'Pending adapter work is visible here. Pending Fabric work is not verified proof.',
          severity: pendingOutboxCount > 0 ? 'warning' : 'success',
          targetRoute: '/integrations',
        },
        {
          id: 'outbox-failed',
          label: 'Outbox failed',
          value: failedOutboxCount,
          description:
            'Failed adapter work requires operator review before external state can be trusted.',
          severity: failedOutboxCount > 0 ? 'danger' : 'success',
          targetRoute: '/integrations',
        },
        {
          id: 'audit-recent',
          label: 'Recent audit events',
          value: recentAuditEvents.length,
          description: 'Recent material actions are available in audit search.',
          severity: 'neutral',
          targetRoute: '/audit/search',
        },
      ],
      activities: recentAuditEvents.map((event) => ({
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

function tasksFor(
  role: DashboardRole,
  counts: {
    pendingRequisitionCount: number;
    submittedApplications: number;
    failedOutboxCount: number;
    opportunityCount: number;
  },
) {
  const tasks: DashboardTask[] = [];

  if (counts.failedOutboxCount > 0) {
    tasks.push({
      id: 'review-failed-outbox',
      title: 'Review failed integration work',
      description:
        'Failed outbox items may affect audit, Fabric, e-signature, or webhook visibility.',
      targetRoute: '/integrations',
      priority: 'critical',
      status: 'open',
    });
  }

  if (counts.pendingRequisitionCount > 0) {
    tasks.push({
      id: 'review-procurement-queue',
      title: 'Review procurement queue',
      description: `${counts.pendingRequisitionCount} requisition item(s) need attention.`,
      targetRoute: '/procurement',
      priority: role === 'procurement_officer' ? 'high' : 'medium',
      status: 'open',
    });
  }

  if (counts.submittedApplications > 0) {
    tasks.push({
      id: 'review-finance-applications',
      title: 'Review finance applications',
      description: `${counts.submittedApplications} application(s) are in review-sensitive states.`,
      targetRoute: '/finance/applications',
      priority:
        role === 'financier' || role === 'shariah_reviewer' ? 'high' : 'medium',
      status: 'open',
    });
  }

  if (!tasks.length) {
    tasks.push({
      id: 'review-dashboard-empty',
      title: 'Review current records',
      description:
        counts.opportunityCount > 0
          ? 'Finance opportunities exist; open the pipeline for details.'
          : 'No urgent backend-backed tasks are currently visible.',
      targetRoute:
        counts.opportunityCount > 0
          ? '/finance/opportunities'
          : '/audit/search',
      priority: 'low',
      status: 'open',
    });
  }

  return tasks;
}
