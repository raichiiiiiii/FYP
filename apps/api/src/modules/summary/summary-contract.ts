export type SummaryArea = 'dashboard' | 'procurement' | 'finance';

export type SummarySeverity = 'neutral' | 'success' | 'warning' | 'danger';

export type QueueItemDto = {
  id: string;
  area: SummaryArea;
  title: string;
  description: string;
  count: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'blocked' | 'pending_external' | 'done';
  targetRoute: string;
};

export type WorkflowBlockerDto = {
  id: string;
  area: SummaryArea;
  title: string;
  description: string;
  count: number;
  severity: SummarySeverity;
  requiredAction: string;
  targetRoute: string;
};

export type ReviewReadinessDto = {
  id: string;
  area: SummaryArea;
  label: string;
  ready: number;
  total: number;
  missing: number;
  status: 'ready' | 'partial' | 'blocked' | 'empty';
  targetRoute: string;
};

export type SummaryMetricDto = {
  id: string;
  label: string;
  value: number;
  helper: string;
  severity: SummarySeverity;
  targetRoute?: string;
};

export type DashboardSummaryDto = {
  organizationId: string;
  generatedAt: string;
  role: string;
  title: string;
  subtitle: string;
  metrics: SummaryMetricDto[];
  queue: QueueItemDto[];
  blockers: WorkflowBlockerDto[];
  readiness: ReviewReadinessDto[];
};

export type ProcurementSummaryDto = {
  organizationId: string;
  generatedAt: string;
  metrics: SummaryMetricDto[];
  queue: QueueItemDto[];
  blockers: WorkflowBlockerDto[];
  readiness: ReviewReadinessDto[];
  statusBreakdown: Record<string, number>;
};

export type FinanceSummaryDto = {
  organizationId: string;
  generatedAt: string;
  metrics: SummaryMetricDto[];
  queue: QueueItemDto[];
  blockers: WorkflowBlockerDto[];
  readiness: ReviewReadinessDto[];
  statusBreakdown: Record<string, number>;
};

const procurementRoles = new Set([
  'ORG_ADMIN',
  'PROCUREMENT_OFFICER',
  'APPROVER',
  'AUDITOR',
]);

const financeRoles = new Set([
  'ORG_ADMIN',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
]);

export function canReadProcurementSummary(roleCodes: readonly string[]) {
  return roleCodes.some((roleCode) => procurementRoles.has(roleCode));
}

export function canReadFinanceSummary(roleCodes: readonly string[]) {
  return roleCodes.some((roleCode) => financeRoles.has(roleCode));
}

export function summarySeverityForCount(
  count: number,
  thresholds: { warning: number; danger: number },
): SummarySeverity {
  if (count >= thresholds.danger) {
    return 'danger';
  }

  if (count >= thresholds.warning) {
    return 'warning';
  }

  return count > 0 ? 'neutral' : 'success';
}

export function buildReviewReadiness(input: {
  id: string;
  area: SummaryArea;
  label: string;
  ready: number;
  total: number;
  targetRoute: string;
}): ReviewReadinessDto {
  const ready = Math.max(0, input.ready);
  const total = Math.max(0, input.total);
  const boundedReady = Math.min(ready, total);
  const missing = Math.max(0, total - boundedReady);

  return {
    id: input.id,
    area: input.area,
    label: input.label,
    ready: boundedReady,
    total,
    missing,
    status: readinessStatus(boundedReady, total),
    targetRoute: input.targetRoute,
  };
}

function readinessStatus(
  ready: number,
  total: number,
): ReviewReadinessDto['status'] {
  if (total === 0) {
    return 'empty';
  }

  if (ready === total) {
    return 'ready';
  }

  if (ready === 0) {
    return 'blocked';
  }

  return 'partial';
}
