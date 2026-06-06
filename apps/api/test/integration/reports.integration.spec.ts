import request from 'supertest';
import { ReportsService } from '../../src/modules/reports/reports.service';
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

  it('persists report export jobs with explicit lifecycle status', async () => {
    const fixture = await createProcurementFixture(context.app);
    const reports = context.app.get(ReportsService);

    const exportJob = await reports.createExportJob({
      organizationId: fixture.organizationId,
      actorUserId: fixture.actorUserId,
      reportType: 'procurement',
      format: 'json',
      metadata: {
        requestedFrom: 'reports.integration.spec.ts',
      },
    });

    expect(exportJob).toEqual(
      expect.objectContaining({
        organizationId: fixture.organizationId,
        requestedByUserId: fixture.actorUserId,
        reportType: 'procurement',
        format: 'json',
        status: 'queued',
      }),
    );

    const processingJob = await reports.transitionExportJob({
      organizationId: fixture.organizationId,
      exportJobId: exportJob.id,
      status: 'processing',
    });

    expect(processingJob.status).toBe('processing');

    const completedJob = await reports.transitionExportJob({
      organizationId: fixture.organizationId,
      exportJobId: exportJob.id,
      status: 'completed',
      objectKey: 'reports/procurement/export.json',
    });

    expect(completedJob).toEqual(
      expect.objectContaining({
        status: 'completed',
        objectKey: 'reports/procurement/export.json',
      }),
    );
    expect(completedJob.completedAt).toBeInstanceOf(Date);

    await expect(
      reports.transitionExportJob({
        organizationId: fixture.organizationId,
        exportJobId: exportJob.id,
        status: 'processing',
      }),
    ).rejects.toThrow(/cannot transition/);
  });

  it('generates downloadable audited JSON report exports', async () => {
    const fixture = await createProcurementFixture(context.app);

    const created = await request(context.app.getHttpServer())
      .post('/api/v1/reports/exports')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        reportType: 'procurement',
        format: 'json',
      })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        organizationId: fixture.organizationId,
        requestedByUserId: fixture.actorUserId,
        reportType: 'procurement',
        format: 'json',
        status: 'completed',
      }),
    );
    expect(created.body.objectKey).toMatch(/^reports\/procurement\//);
    expect(created.body.filePath).toMatch(/^s3:\/\//);

    const read = await request(context.app.getHttpServer())
      .get(`/api/v1/reports/exports/${created.body.id}`)
      .query({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
      })
      .expect(200);

    expect(read.body.status).toBe('completed');

    const download = await request(context.app.getHttpServer())
      .get(`/api/v1/reports/exports/${created.body.id}/download`)
      .query({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
      })
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const artifact = JSON.parse(download.text) as {
      exportJob: { id: string; reportType: string };
      report: { counts: { purchaseOrders: number; invoices: number } };
    };
    expect(artifact.exportJob).toEqual(
      expect.objectContaining({
        id: created.body.id,
        reportType: 'procurement',
      }),
    );
    expect(artifact.report.counts).toEqual(
      expect.objectContaining({
        purchaseOrders: 1,
        invoices: 1,
      }),
    );

    const events = await context.prisma.auditEvent.findMany({
      where: {
        organizationId: fixture.organizationId,
        entityType: 'ReportExportJob',
        entityId: created.body.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        'REPORT_EXPORT_REQUESTED',
        'REPORT_EXPORT_COMPLETED',
        'REPORT_EXPORT_DOWNLOADED',
      ]),
    );
  });

  it('generates downloadable audited CSV report exports', async () => {
    const fixture = await createProcurementFixture(context.app);

    const created = await request(context.app.getHttpServer())
      .post('/api/v1/reports/exports')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        reportType: 'procurement',
        format: 'csv',
      })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        organizationId: fixture.organizationId,
        requestedByUserId: fixture.actorUserId,
        reportType: 'procurement',
        format: 'csv',
        status: 'completed',
      }),
    );
    expect(created.body.objectKey).toMatch(
      new RegExp(`^reports/procurement/${created.body.id}\\.csv$`),
    );

    const download = await request(context.app.getHttpServer())
      .get(`/api/v1/reports/exports/${created.body.id}/download`)
      .query({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
      })
      .expect(200)
      .expect('Content-Type', /text\/csv/)
      .expect(
        'Content-Disposition',
        new RegExp(`procurement-report-${created.body.id}\\.csv`),
      );

    expect(download.text.split('\n')[0]).toBe('section,metric,value');
    expect(download.text).toContain('report,type,procurement');
    expect(download.text).toContain('counts,purchaseOrders,1');
    expect(download.text).toContain('counts,invoices,1');

    const events = await context.prisma.auditEvent.findMany({
      where: {
        organizationId: fixture.organizationId,
        entityType: 'ReportExportJob',
        entityId: created.body.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        'REPORT_EXPORT_REQUESTED',
        'REPORT_EXPORT_COMPLETED',
        'REPORT_EXPORT_DOWNLOADED',
      ]),
    );
    expect(events.map((event) => event.metadata)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          format: 'csv',
        }),
      ]),
    );
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

    const reports = context.app.get(ReportsService);

    await expect(
      reports.createExportJob({
        organizationId: setup.organization.id,
        actorUserId: user.id,
        reportType: 'finance',
        format: 'json',
      }),
    ).rejects.toThrow('Finance report access denied');

    await expect(
      reports.createExportJob({
        organizationId: setup.organization.id,
        actorUserId: user.id,
        reportType: 'finance',
        format: 'csv',
      }),
    ).rejects.toThrow('Finance report access denied');
  });
});
