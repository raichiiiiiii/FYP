import request from 'supertest';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: dashboard summary', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('returns role-filtered queue, blocker, and readiness fields', async () => {
    const setup = await createOrganizationFixture(context.app);
    const organizationId = setup.organization.id;

    const project = await context.prisma.project.create({
      data: {
        organizationId,
        name: 'Dashboard Summary Project',
        code: 'DASH-SUM',
        budget: 10000,
      },
    });

    await context.prisma.requisition.create({
      data: {
        organizationId,
        projectId: project.id,
        title: 'Pending dashboard requisition',
        status: 'SUBMITTED',
        totalAmount: 5000,
      },
    });

    const opportunity = await context.prisma.procurementOpportunity.create({
      data: {
        organizationId,
        projectId: project.id,
        title: 'Dashboard finance opportunity',
        status: 'OPEN',
        estimatedCapital: 5000,
      },
    });

    await context.prisma.mudarabahApplication.create({
      data: {
        organizationId,
        opportunityId: opportunity.id,
        status: 'SUBMITTED',
        requestedCapital: 5000,
      },
    });

    await context.prisma.auditEvent.createMany({
      data: [
        {
          organizationId,
          eventType: 'REQUISITION_SUBMITTED',
          entityType: 'Requisition',
          entityId: 'req-dashboard',
        },
        {
          organizationId,
          eventType: 'APPLICATION_SUBMITTED',
          entityType: 'MudarabahApplication',
          entityId: 'app-dashboard',
        },
      ],
    });

    const response = await request(context.app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .query({
        organizationId,
        roleCodes: 'PROCUREMENT_OFFICER',
      })
      .expect(200);

    expect(
      response.body.metrics.map((metric: { id: string }) => metric.id),
    ).toContain('requisitions');
    expect(
      response.body.metrics.map((metric: { id: string }) => metric.id),
    ).not.toContain('applications');
    expect(
      response.body.queue.map((item: { area: string }) => item.area),
    ).toEqual(['procurement']);
    expect(
      response.body.readiness.map((item: { id: string }) => item.id),
    ).toEqual(['procurement-approvals']);
    const visibleEventTypes = response.body.activities.map(
      (activity: { eventType: string }) => activity.eventType,
    );
    expect(visibleEventTypes).toContain('REQUISITION_SUBMITTED');
    expect(visibleEventTypes).not.toContain('APPLICATION_SUBMITTED');
  });
});
