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
});

function prismaForRoles(roleCodes: string[]) {
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
      findMany: jest.fn().mockResolvedValue([
        auditAnchor({
          id: 'anchor-po',
          rootHash: poHash,
        }),
        auditAnchor({
          id: 'anchor-finance',
          rootHash: financeHash,
        }),
      ]),
    },
    outboxEvent: {
      findMany: jest.fn().mockResolvedValue([]),
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
            supplier: {
              id: 'supplier-1',
              name: 'Mega Components',
              email: 'supplier@example.com',
              status: 'ACTIVE',
            },
            invoices: [],
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
        applications: [],
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

function auditAnchor(overrides: { id: string; rootHash: string }) {
  return {
    organizationId: 'org-1',
    anchorType: 'FABRIC',
    status: 'ANCHORED',
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
    ...overrides,
  };
}
