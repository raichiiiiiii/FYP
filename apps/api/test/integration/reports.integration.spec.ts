import request from 'supertest';
import {
  createOrganizationFixture,
  createProcurementFixture,
} from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: reports', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('returns role-filtered report summary and procurement DTOs', async () => {
    const fixture = await createProcurementFixture(context.app);

    const summary = await request(context.app.getHttpServer())
      .get('/api/v1/reports/summary')
      .query({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
      })
      .expect(200);

    expect(summary.body.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'procurement',
          status: 'ready',
        }),
      ]),
    );
    expect(summary.body.totals.procurement).toBeGreaterThan(0);

    const procurement = await request(context.app.getHttpServer())
      .get('/api/v1/reports/procurement')
      .query({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
      })
      .expect(200);

    expect(procurement.body.counts).toEqual(
      expect.objectContaining({
        projects: 1,
        suppliers: 1,
        purchaseOrders: 1,
        invoices: 1,
      }),
    );
  });

  it('denies report access without active organization membership', async () => {
    const setup = await createOrganizationFixture(context.app);
    const outsider = await context.prisma.user.create({
      data: {
        email: 'report-outsider@example.test',
        displayName: 'Report Outsider',
      },
    });

    await request(context.app.getHttpServer())
      .get('/api/v1/reports/summary')
      .query({
        organizationId: setup.organization.id,
        actorUserId: outsider.id,
      })
      .expect(403);
  });

  it('hides finance reports from procurement-only actors', async () => {
    const setup = await createOrganizationFixture(context.app);
    const role = await context.prisma.role.create({
      data: {
        code: 'PROCUREMENT_OFFICER',
        name: 'Procurement Officer',
      },
    });
    const user = await context.prisma.user.create({
      data: {
        email: 'report-procurement@example.test',
        displayName: 'Report Procurement',
      },
    });

    await context.prisma.membership.create({
      data: {
        organizationId: setup.organization.id,
        userId: user.id,
        roleId: role.id,
      },
    });

    const summary = await request(context.app.getHttpServer())
      .get('/api/v1/reports/summary')
      .query({
        organizationId: setup.organization.id,
        actorUserId: user.id,
      })
      .expect(200);

    expect(summary.body.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'finance',
          status: 'restricted',
        }),
      ]),
    );

    await request(context.app.getHttpServer())
      .get('/api/v1/reports/finance')
      .query({
        organizationId: setup.organization.id,
        actorUserId: user.id,
      })
      .expect(403);
  });
});
