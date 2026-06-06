import { GraphService } from './graph.service';

const now = new Date('2026-06-05T00:00:00.000Z');
const poHash =
  'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const financeHash =
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

describe('GraphService Fabric anchor overlay', () => {
  it('adds hash and anchor nodes for visible source records', async () => {
    const service = new GraphService(prismaForRoles(['ORG_ADMIN']));

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
    });

    expect(graph.nodes.some((node) => node.entityType === 'HashRecord')).toBe(
      true,
    );
    expect(graph.nodes.some((node) => node.entityType === 'AuditAnchor')).toBe(
      true,
    );
    expect(graph.edges.some((edge) => edge.label === 'verifies')).toBe(true);
    expect(graph.edges.some((edge) => edge.label === 'anchors')).toBe(true);
  });

  it('does not expose finance hash or anchor nodes when finance records are hidden', async () => {
    const service = new GraphService(prismaForRoles(['PROCUREMENT_OFFICER']));

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
    });
    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    expect(nodeIds.has('ProcurementOpportunity:opp-1')).toBe(false);
    expect(nodeIds.has('HashRecord:hash-finance')).toBe(false);
    expect(nodeIds.has('AuditAnchor:anchor-finance')).toBe(false);
    expect(nodeIds.has('HashRecord:hash-po')).toBe(true);
    expect(nodeIds.has('AuditAnchor:anchor-po')).toBe(true);
    expect(
      graph.edges.every(
        (edge) =>
          nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId),
      ),
    ).toBe(true);
  });

  it('adds backend-owned risk metadata for visible procurement, finance, and anchor issues', async () => {
    const service = new GraphService(
      prismaForRoles(['ORG_ADMIN'], {
        anchors: [
          auditAnchor({
            id: 'anchor-po',
            rootHash: poHash,
            status: 'FAILED',
          }),
          auditAnchor({
            id: 'anchor-finance',
            rootHash: financeHash,
          }),
        ],
      }),
    );

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
    });
    const purchaseOrder = graph.nodes.find(
      (node) => node.id === 'PurchaseOrder:po-1',
    );
    const application = graph.nodes.find(
      (node) => node.id === 'MudarabahApplication:app-1',
    );
    const anchor = graph.nodes.find(
      (node) => node.id === 'AuditAnchor:anchor-po',
    );

    expect(purchaseOrder?.risk?.riskLevel).toBe('high');
    expect(purchaseOrder?.risk?.visibilityScope).toBe('procurement');
    expect(purchaseOrder?.risk?.riskReasons).toContain(
      'Invoice exists before a recorded receipt; matching needs review.',
    );
    expect(application?.risk?.riskLevel).toBe('critical');
    expect(application?.risk?.visibilityScope).toBe('finance');
    expect(application?.risk?.riskReasons).toContain(
      'Unresolved loss exception blocks closure until reviewer resolution.',
    );
    expect(anchor?.risk?.riskLevel).toBe('high');
    expect(anchor?.risk?.visibilityScope).toBe('operations');
  });

  it('does not leak hidden finance risk reasons to procurement-only graph responses', async () => {
    const service = new GraphService(prismaForRoles(['PROCUREMENT_OFFICER']));

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
    });
    const serialized = JSON.stringify(graph);

    expect(serialized).not.toContain('Finance evidence checklist');
    expect(serialized).not.toContain('Unresolved loss exception');
    expect(serialized).not.toContain('MudarabahApplication:app-1');
  });

  it('filters graph nodes by query parameters after visibility filtering', async () => {
    const service = new GraphService(prismaForRoles(['ORG_ADMIN']));

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
      filters: {
        nodeType: 'application',
        riskLevel: 'critical',
        status: 'UNDER_REVIEW',
      },
    });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.id).toBe('MudarabahApplication:app-1');
    expect(graph.nodes[0]?.entityType).toBe('MudarabahApplication');
    expect(graph.edges).toHaveLength(0);
  });

  it('does not let includeFinance query params bypass role-filtered finance visibility', async () => {
    const service = new GraphService(prismaForRoles(['PROCUREMENT_OFFICER']));

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
      filters: {
        includeFinance: 'true',
      },
    });

    expect(graph.nodes.some((node) => node.category === 'finance')).toBe(false);
    expect(JSON.stringify(graph)).not.toContain('MudarabahApplication:app-1');
  });

  it('can hide hash and anchor overlay nodes from filtered graph views', async () => {
    const service = new GraphService(prismaForRoles(['ORG_ADMIN']));

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
      filters: {
        includeAnchors: 'false',
      },
    });

    expect(graph.nodes.some((node) => node.entityType === 'HashRecord')).toBe(
      false,
    );
    expect(graph.nodes.some((node) => node.entityType === 'AuditAnchor')).toBe(
      false,
    );
    expect(
      graph.edges.every(
        (edge) =>
          graph.nodes.some((node) => node.id === edge.sourceNodeId) &&
          graph.nodes.some((node) => node.id === edge.targetNodeId),
      ),
    ).toBe(true);
  });

  it('treats status=all as an unfiltered graph view', async () => {
    const service = new GraphService(prismaForRoles(['ORG_ADMIN']));

    const graph = await service.getProjectGraph({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      projectId: 'project-1',
      filters: {
        status: 'all',
      },
    });

    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.nodes.some((node) => node.id === 'Project:project-1')).toBe(
      true,
    );
  });
});

function prismaForRoles(
  roleCodes: string[],
  overrides: {
    anchors?: ReturnType<typeof auditAnchor>[];
    outboxEvents?: Array<Record<string, unknown>>;
  } = {},
) {
  return {
    membership: {
      findMany: jest.fn().mockResolvedValue(
        roleCodes.map((code) => ({
          role: {
            code,
          },
        })),
      ),
    },
    project: {
      findUnique: jest.fn().mockResolvedValue(projectFixture()),
    },
    hashRecord: {
      findMany: jest.fn().mockResolvedValue([
        hashRecord({
          id: 'hash-po',
          entityType: 'PurchaseOrder',
          entityId: 'po-1',
          canonicalHash: poHash,
        }),
        hashRecord({
          id: 'hash-finance',
          entityType: 'ProcurementOpportunity',
          entityId: 'opp-1',
          canonicalHash: financeHash,
        }),
      ]),
    },
    auditAnchor: {
      findMany: jest.fn().mockResolvedValue(
        overrides.anchors ?? [
          auditAnchor({
            id: 'anchor-po',
            rootHash: poHash,
          }),
          auditAnchor({
            id: 'anchor-finance',
            rootHash: financeHash,
          }),
        ],
      ),
    },
    outboxEvent: {
      findMany: jest.fn().mockResolvedValue(overrides.outboxEvents ?? []),
    },
  } as never;
}

function projectFixture() {
  return {
    id: 'project-1',
    organizationId: 'org-1',
    name: 'Solar deployment',
    code: 'PRJ-001',
    status: 'ACTIVE',
    organization: {
      legalName: 'TechBuild Sdn Bhd',
      deploymentMode: 'standalone_sme',
    },
    requisitions: [
      {
        id: 'req-1',
        title: 'Panel procurement',
        status: 'APPROVED',
        rfqs: [],
        purchaseOrders: [
          {
            id: 'po-1',
            poNumber: 'PO-001',
            status: 'ISSUED',
            totalAmount: 3000,
            supplier: {
              id: 'supplier-1',
              name: 'Mega Components',
              email: 'supplier@example.com',
              status: 'ACTIVE',
            },
            receipts: [],
            invoices: [
              {
                id: 'invoice-1',
                invoiceNumber: 'INV-001',
                amount: 3500,
                status: 'RECORDED',
              },
            ],
            quotation: null,
          },
        ],
      },
    ],
    evidencePacks: [],
    financeOpportunities: [
      {
        id: 'opp-1',
        title: 'Working capital',
        status: 'READY_FOR_APPLICATION',
        evidencePackId: null,
        evidencePack: null,
        applications: [
          {
            id: 'app-1',
            status: 'UNDER_REVIEW',
            currency: 'MYR',
            requestedCapital: 6000,
            evidenceChecklist: {
              status: 'PENDING',
              items: [
                {
                  status: 'PENDING',
                },
              ],
            },
            lossExceptions: [
              {
                status: 'OPEN',
              },
            ],
            contracts: [],
            closurePacks: [],
          },
        ],
      },
    ],
  };
}

function hashRecord(overrides: {
  id: string;
  entityType: string;
  entityId: string;
  canonicalHash: string;
}) {
  return {
    organizationId: 'org-1',
    hashAlgorithm: 'SHA-256',
    canonicalJson: {},
    canonicalText: '{}',
    createdAt: now,
    verifiedAt: null,
    ...overrides,
  };
}

function auditAnchor(overrides: {
  id: string;
  rootHash: string;
  status?: string;
}) {
  return {
    organizationId: 'org-1',
    anchorType: 'FABRIC',
    status: overrides.status ?? 'ANCHORED',
    fromAuditEventId: null,
    toAuditEventId: null,
    metadata: {},
    anchoredAt: now,
    fabricTransactionId: `tx-${overrides.id}`,
    fabricBlockNumber: 12,
    fabricChannel: 'mepn-audit',
    fabricChaincode: 'audit-anchor',
    fabricCommitStatus: 'VALID',
    fabricEndorsementStatus: null,
    fabricVerifiedAt: null,
    createdAt: now,
    id: overrides.id,
    rootHash: overrides.rootHash,
  };
}
