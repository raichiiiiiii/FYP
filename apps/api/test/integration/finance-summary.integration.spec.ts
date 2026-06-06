import request from 'supertest';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: finance summary', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('returns backend-owned finance summary DTOs for allowed roles', async () => {
    const setup = await createOrganizationFixture(context.app);
    const organizationId = setup.organization.id;

    const project = await context.prisma.project.create({
      data: {
        organizationId,
        name: 'Finance Summary Project',
        code: 'FIN-SUM',
        budget: 20000,
      },
    });

    const opportunity = await context.prisma.procurementOpportunity.create({
      data: {
        organizationId,
        projectId: project.id,
        title: 'Finance summary opportunity',
        status: 'OPEN',
        estimatedCapital: 10000,
        expectedProfit: 2500,
      },
    });

    const application = await context.prisma.mudarabahApplication.create({
      data: {
        organizationId,
        opportunityId: opportunity.id,
        status: 'SHARIAH_IN_REVIEW',
        requestedCapital: 10000,
      },
    });

    await context.prisma.evidenceChecklist.create({
      data: {
        organizationId,
        applicationId: application.id,
        status: 'PENDING',
      },
    });

    await context.prisma.lossException.create({
      data: {
        organizationId,
        applicationId: application.id,
        exceptionType: 'GENUINE_COMMERCIAL_LOSS',
        status: 'OPEN',
        amount: 1500,
        notes: 'Seeded unresolved loss exception for summary test.',
      },
    });

    const response = await request(context.app.getHttpServer())
      .get('/api/v1/finance/summary')
      .query({
        organizationId,
        roleCodes: 'FINANCIER_USER',
      })
      .expect(200);

    expect(
      response.body.metrics.map((metric: { id: string }) => metric.id),
    ).toEqual(
      expect.arrayContaining([
        'finance-opportunities',
        'finance-applications',
        'finance-evidence-gaps',
        'finance-review-queues',
        'finance-loss-exceptions',
      ]),
    );
    expect(response.body.queue.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([
        'finance-application-review-queue',
        'finance-evidence-gap-queue',
        'finance-shariah-review-queue',
        'finance-loss-exception-queue',
      ]),
    );
    expect(
      response.body.blockers.map((blocker: { id: string }) => blocker.id),
    ).toEqual(
      expect.arrayContaining([
        'finance-evidence-gaps',
        'finance-unresolved-loss-exceptions',
      ]),
    );
    expect(response.body.statusBreakdown).toEqual(
      expect.objectContaining({
        SHARIAH_IN_REVIEW: 1,
      }),
    );
  });

  it('denies finance summary to roles without finance visibility', async () => {
    const setup = await createOrganizationFixture(context.app);

    await request(context.app.getHttpServer())
      .get('/api/v1/finance/summary')
      .query({
        organizationId: setup.organization.id,
        roleCodes: 'PROCUREMENT_OFFICER',
      })
      .expect(403);
  });
});
