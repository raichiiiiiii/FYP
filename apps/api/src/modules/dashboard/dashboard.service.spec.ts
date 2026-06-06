import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('returns procurement-only summary fields without finance leakage', async () => {
    const service = new DashboardService(
      createPrismaMock({
        pendingRequisitionCount: 2,
        applicationCount: 4,
        submittedApplications: 3,
        recentAuditEvents: [
          auditEvent('req-1', 'REQUISITION_SUBMITTED', 'Requisition'),
          auditEvent('app-1', 'APPLICATION_SUBMITTED', 'MudarabahApplication'),
          auditEvent('anchor-1', 'FABRIC_ANCHOR_FAILED', 'AuditAnchor'),
        ],
      }) as never,
    );

    const summary = await service.getSummary({
      organizationId: 'org-demo',
      roleCodes: ['PROCUREMENT_OFFICER'],
    });

    expect(summary.metrics.map((metric) => metric.id)).toContain(
      'requisitions',
    );
    expect(summary.metrics.map((metric) => metric.id)).not.toContain(
      'applications',
    );
    expect(summary.queue.map((task) => task.id)).toContain(
      'review-procurement-queue',
    );
    expect(summary.queue.map((task) => task.id)).not.toContain(
      'review-finance-applications',
    );
    expect(summary.readiness.map((item) => item.area)).toEqual(['procurement']);
    expect(summary.activities.map((activity) => activity.eventType)).toEqual([
      'REQUISITION_SUBMITTED',
    ]);
  });

  it('returns admin review queues, blockers, and readiness across allowed areas', async () => {
    const service = new DashboardService(
      createPrismaMock({
        pendingRequisitionCount: 1,
        submittedApplications: 2,
        failedOutboxCount: 1,
        fabricPendingAnchorCount: 1,
        fabricFailedAnchorCount: 1,
        unresolvedLossExceptionCount: 1,
      }) as never,
    );

    const summary = await service.getSummary({
      organizationId: 'org-demo',
      roleCodes: ['ORG_ADMIN'],
    });

    expect(summary.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        'projects',
        'requisitions',
        'applications',
        'audit-events',
        'outbox-backlog',
      ]),
    );
    expect(summary.queue.map((task) => task.id)).toEqual(
      expect.arrayContaining([
        'review-failed-outbox',
        'review-procurement-queue',
        'review-finance-applications',
        'review-loss-exceptions',
        'review-pending-fabric-anchors',
      ]),
    );
    expect(summary.blockers.map((blocker) => blocker.id)).toEqual(
      expect.arrayContaining([
        'failed-outbox',
        'failed-fabric-anchors',
        'unresolved-loss-exceptions',
      ]),
    );
    expect(summary.readiness.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'procurement-approvals',
        'finance-application-review',
        'loss-exception-resolution',
        'fabric-anchor-readiness',
      ]),
    );
  });
});

function createPrismaMock(overrides: Partial<DashboardCounts> = {}) {
  const counts: DashboardCounts = {
    projectCount: 3,
    requisitionCount: 5,
    pendingRequisitionCount: 0,
    opportunityCount: 2,
    applicationCount: 4,
    submittedApplications: 0,
    pendingOutboxCount: 0,
    failedOutboxCount: 0,
    auditEventCount: 9,
    recentAuditEvents: [],
    fabricPendingAnchorCount: 0,
    fabricFailedAnchorCount: 0,
    unresolvedLossExceptionCount: 0,
    ...overrides,
  };

  return {
    project: { count: jest.fn().mockResolvedValue(counts.projectCount) },
    requisition: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.requisitionCount)
        .mockResolvedValueOnce(counts.pendingRequisitionCount),
    },
    procurementOpportunity: {
      count: jest.fn().mockResolvedValue(counts.opportunityCount),
    },
    mudarabahApplication: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.applicationCount)
        .mockResolvedValueOnce(counts.submittedApplications),
    },
    outboxEvent: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.pendingOutboxCount)
        .mockResolvedValueOnce(counts.failedOutboxCount),
    },
    auditEvent: {
      count: jest.fn().mockResolvedValue(counts.auditEventCount),
      findMany: jest.fn().mockResolvedValue(counts.recentAuditEvents),
    },
    auditAnchor: {
      count: jest
        .fn()
        .mockResolvedValueOnce(counts.fabricPendingAnchorCount)
        .mockResolvedValueOnce(counts.fabricFailedAnchorCount),
    },
    lossException: {
      count: jest.fn().mockResolvedValue(counts.unresolvedLossExceptionCount),
    },
  };
}

type DashboardCounts = {
  projectCount: number;
  requisitionCount: number;
  pendingRequisitionCount: number;
  opportunityCount: number;
  applicationCount: number;
  submittedApplications: number;
  pendingOutboxCount: number;
  failedOutboxCount: number;
  auditEventCount: number;
  recentAuditEvents: Array<{
    id: string;
    eventType: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: Date;
  }>;
  fabricPendingAnchorCount: number;
  fabricFailedAnchorCount: number;
  unresolvedLossExceptionCount: number;
};

function auditEvent(id: string, eventType: string, entityType: string) {
  return {
    id,
    eventType,
    entityType,
    entityId: id,
    createdAt: new Date('2026-06-06T00:00:00.000Z'),
  };
}
