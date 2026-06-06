import request from 'supertest';
import { createProcurementFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: graph read model', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('builds a project graph from real records and hides finance nodes for procurement-only actors', async () => {
    const fixture = await createProcurementFixture(context.app);
    const evidencePack = (
      await request(context.app.getHttpServer())
        .post('/api/v1/evidence-packs')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
          title: 'Integration project graph evidence',
        })
        .expect(201)
    ).body as { id: string };
    const opportunity = (
      await request(context.app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
          requisitionId: fixture.requisition.id,
          purchaseOrderId: fixture.purchaseOrder.id,
          evidencePackId: evidencePack.id,
          title: 'Integration graph finance opportunity',
          estimatedCapital: 6000,
          expectedProfit: 1200,
        })
        .expect(201)
    ).body as { id: string };
    await request(context.app.getHttpServer())
      .post('/api/v1/applications')
      .send({
        organizationId: fixture.organizationId,
        actorUserId: fixture.actorUserId,
        opportunityId: opportunity.id,
        requestedCapital: 6000,
        capitalProviderRatio: 0.6,
        entrepreneurRatio: 0.4,
      })
      .expect(201);

    const adminGraph = (
      await request(context.app.getHttpServer())
        .get(`/api/v1/graph/projects/${fixture.project.id}`)
        .query({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
        })
        .expect(200)
    ).body as {
      visibility: { financeNodesIncluded: boolean };
      nodes: Array<{
        entityType: string;
        sourcePath: string;
        risk?: {
          riskLevel: string;
          riskReasons: string[];
          visibilityScope: string;
        };
      }>;
      edges: Array<{ label: string }>;
    };
    const adminEntityTypes = adminGraph.nodes.map((node) => node.entityType);

    expect(adminGraph.visibility.financeNodesIncluded).toBe(true);
    expect(adminEntityTypes).toEqual(
      expect.arrayContaining([
        'Organization',
        'BuyerCustomer',
        'Project',
        'Requisition',
        'RFQ',
        'Quotation',
        'PurchaseOrder',
        'Invoice',
        'EvidencePack',
        'ProcurementOpportunity',
        'MudarabahApplication',
      ]),
    );
    expect(adminGraph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'PurchaseOrder',
          sourcePath: `/procurement/purchase-orders/${fixture.purchaseOrder.id}`,
        }),
        expect.objectContaining({
          entityType: 'EvidencePack',
          sourcePath: `/evidence/packs/${evidencePack.id}`,
        }),
      ]),
    );
    expect(adminGraph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'evidences' }),
        expect.objectContaining({ label: 'funds' }),
        expect.objectContaining({ label: 'closes' }),
      ]),
    );
    expect(adminGraph.nodes.some((node) => node.risk?.riskReasons.length)).toBe(
      true,
    );

    const applicationOnlyGraph = (
      await request(context.app.getHttpServer())
        .get(`/api/v1/graph/projects/${fixture.project.id}`)
        .query({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          nodeType: 'application',
          includeFinance: 'true',
        })
        .expect(200)
    ).body as {
      nodes: Array<{ entityType: string }>;
      edges: Array<{ label: string }>;
    };

    expect(applicationOnlyGraph.nodes.length).toBeGreaterThan(0);
    expect(
      applicationOnlyGraph.nodes.every(
        (node) => node.entityType === 'MudarabahApplication',
      ),
    ).toBe(true);
    expect(applicationOnlyGraph.edges).toHaveLength(0);

    const procurementRole = await context.prisma.role.upsert({
      where: { code: 'PROCUREMENT_OFFICER' },
      create: { code: 'PROCUREMENT_OFFICER', name: 'Procurement Officer' },
      update: {},
    });
    const procurementUser = await context.prisma.user.create({
      data: {
        email: `graph-procurement-${Date.now()}@example.test`,
        displayName: 'Graph Procurement Officer',
      },
    });
    await context.prisma.membership.create({
      data: {
        organizationId: fixture.organizationId,
        userId: procurementUser.id,
        roleId: procurementRole.id,
      },
    });

    const procurementGraph = (
      await request(context.app.getHttpServer())
        .get(`/api/v1/graph/projects/${fixture.project.id}`)
        .query({
          organizationId: fixture.organizationId,
          actorUserId: procurementUser.id,
          includeFinance: 'true',
        })
        .expect(200)
    ).body as {
      visibility: { financeNodesIncluded: boolean };
      nodes: Array<{ entityType: string }>;
    };
    const procurementEntityTypes = procurementGraph.nodes.map(
      (node) => node.entityType,
    );
    const procurementGraphText = JSON.stringify(procurementGraph);

    expect(procurementGraph.visibility.financeNodesIncluded).toBe(false);
    expect(procurementEntityTypes).toContain('PurchaseOrder');
    expect(procurementEntityTypes).not.toContain('ProcurementOpportunity');
    expect(procurementEntityTypes).not.toContain('MudarabahApplication');
    expect(procurementGraphText).not.toContain('Finance evidence checklist');
    expect(procurementGraphText).not.toContain('Unresolved loss exception');
  });
});
