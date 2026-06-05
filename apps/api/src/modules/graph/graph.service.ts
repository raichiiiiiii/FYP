import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AuditAnchor,
  HashRecord,
  IntegrationReconciliationRecord,
  OutboxEvent,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type GraphNodeCategory =
  | 'organization'
  | 'party'
  | 'procurement'
  | 'evidence'
  | 'finance';

type ProjectGraphNode = {
  id: string;
  entityType: string;
  entityId: string;
  label: string;
  subtitle?: string;
  status?: string;
  category: GraphNodeCategory;
  sourcePath: string;
  position: {
    x: number;
    y: number;
  };
};

type ProjectGraphEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
};

type ActorRoleCode =
  | 'ORG_ADMIN'
  | 'PROCUREMENT_OFFICER'
  | 'APPROVER'
  | 'FINANCIER_USER'
  | 'SHARIAH_REVIEWER'
  | 'AUDITOR';

type OutboxWithReconciliation = OutboxEvent & {
  reconciliationRecord: IntegrationReconciliationRecord | null;
};

const financeVisibleRoles = new Set<ActorRoleCode>([
  'ORG_ADMIN',
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
]);

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectGraph(input: {
    organizationId?: string;
    actorUserId?: string;
    projectId: string;
  }) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const actorUserId = requireText(input.actorUserId, 'actorUserId');
    const roleCodes = await this.getActorRoleCodes(organizationId, actorUserId);
    const canSeeFinance = roleCodes.some((roleCode) =>
      financeVisibleRoles.has(roleCode),
    );
    const project = await this.prisma.project.findUnique({
      where: {
        id: input.projectId,
      },
      include: {
        organization: true,
        requisitions: {
          include: {
            rfqs: {
              include: {
                quotations: {
                  include: {
                    supplier: true,
                    purchaseOrders: {
                      include: {
                        supplier: true,
                        invoices: true,
                      },
                    },
                  },
                },
              },
            },
            purchaseOrders: {
              include: {
                supplier: true,
                invoices: true,
                quotation: {
                  include: {
                    supplier: true,
                  },
                },
              },
            },
          },
        },
        evidencePacks: true,
        financeOpportunities: {
          include: {
            evidencePack: true,
            applications: {
              include: {
                contracts: true,
                closurePacks: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Project is outside the organization');
    }

    const nodes = new Map<string, ProjectGraphNode>();
    const edges = new Map<string, ProjectGraphEdge>();
    const addNode = (node: ProjectGraphNode) => nodes.set(node.id, node);
    const addEdge = (
      sourceNodeId: string,
      targetNodeId: string,
      label: string,
    ) => {
      if (!nodes.has(sourceNodeId) || !nodes.has(targetNodeId)) {
        return;
      }

      const id = `${sourceNodeId}:${label}:${targetNodeId}`;
      edges.set(id, {
        id,
        sourceNodeId,
        targetNodeId,
        label,
      });
    };

    const orgNodeId = nodeId('Organization', project.organizationId);
    const buyerNodeId = nodeId('BuyerCustomer', project.organizationId);
    const projectNodeId = nodeId('Project', project.id);

    addNode({
      id: orgNodeId,
      entityType: 'Organization',
      entityId: project.organizationId,
      label: project.organization.legalName,
      subtitle: 'Organization',
      status: project.organization.deploymentMode,
      category: 'organization',
      sourcePath: '/dashboard',
      position: { x: 80, y: 80 },
    });
    addNode({
      id: buyerNodeId,
      entityType: 'BuyerCustomer',
      entityId: project.organizationId,
      label: `${project.organization.legalName} buyer workspace`,
      subtitle: 'Buyer/customer',
      status: 'ACTIVE',
      category: 'party',
      sourcePath: '/dashboard',
      position: { x: 80, y: 260 },
    });
    addNode({
      id: projectNodeId,
      entityType: 'Project',
      entityId: project.id,
      label: project.name,
      subtitle: project.code || 'Procurement project',
      status: project.status,
      category: 'procurement',
      sourcePath: '/procurement/projects',
      position: { x: 280, y: 170 },
    });
    addEdge(orgNodeId, buyerNodeId, 'owns');
    addEdge(buyerNodeId, projectNodeId, 'buys for');

    for (const [index, requisition] of project.requisitions.entries()) {
      const requisitionNodeId = nodeId('Requisition', requisition.id);
      addNode({
        id: requisitionNodeId,
        entityType: 'Requisition',
        entityId: requisition.id,
        label: requisition.title,
        subtitle: 'Requisition',
        status: requisition.status,
        category: 'procurement',
        sourcePath: `/procurement/requisitions/${requisition.id}`,
        position: { x: 480, y: 80 + index * 170 },
      });
      addEdge(projectNodeId, requisitionNodeId, 'requests');

      for (const [rfqIndex, rfq] of requisition.rfqs.entries()) {
        const rfqNodeId = nodeId('RFQ', rfq.id);
        addNode({
          id: rfqNodeId,
          entityType: 'RFQ',
          entityId: rfq.id,
          label: rfq.title,
          subtitle: 'RFQ',
          status: rfq.status,
          category: 'procurement',
          sourcePath: `/procurement/rfqs/${rfq.id}`,
          position: { x: 660, y: 40 + index * 170 + rfqIndex * 90 },
        });
        addEdge(requisitionNodeId, rfqNodeId, 'sources');

        for (const [quotationIndex, quotation] of rfq.quotations.entries()) {
          const supplierNodeId = nodeId('Supplier', quotation.supplier.id);
          const quotationNodeId = nodeId('Quotation', quotation.id);
          addNode({
            id: supplierNodeId,
            entityType: 'Supplier',
            entityId: quotation.supplier.id,
            label: quotation.supplier.name,
            subtitle: quotation.supplier.email || 'Supplier',
            status: quotation.supplier.status,
            category: 'party',
            sourcePath: `/procurement/suppliers/${quotation.supplier.id}`,
            position: {
              x: 840,
              y: 20 + index * 170 + quotationIndex * 120,
            },
          });
          addNode({
            id: quotationNodeId,
            entityType: 'Quotation',
            entityId: quotation.id,
            label: `Quotation ${quotation.id.slice(0, 8)}`,
            subtitle: quotation.supplier.name,
            status: quotation.status,
            category: 'procurement',
            sourcePath: '/procurement/quotations',
            position: {
              x: 840,
              y: 90 + index * 170 + quotationIndex * 120,
            },
          });
          addEdge(supplierNodeId, quotationNodeId, 'supplies');
          addEdge(rfqNodeId, quotationNodeId, 'receives');
        }
      }

      for (const [
        poIndex,
        purchaseOrder,
      ] of requisition.purchaseOrders.entries()) {
        const supplierNodeId = nodeId('Supplier', purchaseOrder.supplier.id);
        const purchaseOrderNodeId = nodeId('PurchaseOrder', purchaseOrder.id);
        addNode({
          id: supplierNodeId,
          entityType: 'Supplier',
          entityId: purchaseOrder.supplier.id,
          label: purchaseOrder.supplier.name,
          subtitle: purchaseOrder.supplier.email || 'Supplier',
          status: purchaseOrder.supplier.status,
          category: 'party',
          sourcePath: `/procurement/suppliers/${purchaseOrder.supplier.id}`,
          position: { x: 840, y: 360 + poIndex * 110 },
        });
        addNode({
          id: purchaseOrderNodeId,
          entityType: 'PurchaseOrder',
          entityId: purchaseOrder.id,
          label: purchaseOrder.poNumber,
          subtitle: purchaseOrder.supplier.name,
          status: purchaseOrder.status,
          category: 'procurement',
          sourcePath: `/procurement/purchase-orders/${purchaseOrder.id}`,
          position: { x: 660, y: 360 + poIndex * 130 },
        });
        addEdge(requisitionNodeId, purchaseOrderNodeId, 'awards');
        addEdge(buyerNodeId, supplierNodeId, 'buys from');
        addEdge(supplierNodeId, purchaseOrderNodeId, 'supplies');

        for (const [
          invoiceIndex,
          invoice,
        ] of purchaseOrder.invoices.entries()) {
          const invoiceNodeId = nodeId('Invoice', invoice.id);
          addNode({
            id: invoiceNodeId,
            entityType: 'Invoice',
            entityId: invoice.id,
            label: invoice.invoiceNumber,
            subtitle: 'Invoice',
            status: invoice.status,
            category: 'procurement',
            sourcePath: '/procurement/invoices',
            position: {
              x: 480,
              y: 400 + poIndex * 130 + invoiceIndex * 80,
            },
          });
          addEdge(purchaseOrderNodeId, invoiceNodeId, 'closes');
        }
      }
    }

    for (const [index, evidencePack] of project.evidencePacks.entries()) {
      const evidencePackNodeId = nodeId('EvidencePack', evidencePack.id);
      addNode({
        id: evidencePackNodeId,
        entityType: 'EvidencePack',
        entityId: evidencePack.id,
        label: evidencePack.title,
        subtitle: 'Evidence pack',
        status: evidencePack.status,
        category: 'evidence',
        sourcePath: `/evidence/packs/${evidencePack.id}`,
        position: { x: 280, y: 390 + index * 100 },
      });
      addEdge(evidencePackNodeId, projectNodeId, 'evidences');
    }

    if (canSeeFinance) {
      for (const [
        index,
        opportunity,
      ] of project.financeOpportunities.entries()) {
        const opportunityNodeId = nodeId(
          'ProcurementOpportunity',
          opportunity.id,
        );
        addNode({
          id: opportunityNodeId,
          entityType: 'ProcurementOpportunity',
          entityId: opportunity.id,
          label: opportunity.title,
          subtitle: 'Finance opportunity',
          status: opportunity.status,
          category: 'finance',
          sourcePath: '/finance/opportunities',
          position: { x: 80, y: 450 + index * 150 },
        });
        addEdge(opportunityNodeId, projectNodeId, 'funds');

        if (opportunity.evidencePackId) {
          addEdge(
            nodeId('EvidencePack', opportunity.evidencePackId),
            opportunityNodeId,
            'evidences',
          );
        }

        for (const [
          applicationIndex,
          application,
        ] of opportunity.applications.entries()) {
          const applicationNodeId = nodeId(
            'MudarabahApplication',
            application.id,
          );
          addNode({
            id: applicationNodeId,
            entityType: 'MudarabahApplication',
            entityId: application.id,
            label: `Application ${application.id.slice(0, 8)}`,
            subtitle: `${application.currency} ${application.requestedCapital}`,
            status: application.status,
            category: 'finance',
            sourcePath: `/finance/applications/${application.id}/overview`,
            position: {
              x: 280,
              y: 560 + index * 150 + applicationIndex * 120,
            },
          });
          addEdge(opportunityNodeId, applicationNodeId, 'approves');

          for (const [
            contractIndex,
            contract,
          ] of application.contracts.entries()) {
            const contractNodeId = nodeId('MudarabahContract', contract.id);
            addNode({
              id: contractNodeId,
              entityType: 'MudarabahContract',
              entityId: contract.id,
              label: contract.contractNumber,
              subtitle: 'Contract',
              status: contract.status,
              category: 'finance',
              sourcePath: `/finance/applications/${application.id}/contract`,
              position: {
                x: 480,
                y: 560 + index * 150 + contractIndex * 120,
              },
            });
            addEdge(applicationNodeId, contractNodeId, 'approves');
          }

          for (const [
            closureIndex,
            closure,
          ] of application.closurePacks.entries()) {
            const closureNodeId = nodeId('ClosurePack', closure.id);
            addNode({
              id: closureNodeId,
              entityType: 'ClosurePack',
              entityId: closure.id,
              label: `Closure ${closure.id.slice(0, 8)}`,
              subtitle: 'Closure pack',
              status: closure.status,
              category: 'finance',
              sourcePath: `/finance/applications/${application.id}/closure`,
              position: {
                x: 660,
                y: 560 + index * 150 + closureIndex * 120,
              },
            });
            addEdge(applicationNodeId, closureNodeId, 'closes');
          }
        }
      }
    }

    await this.addHashAnchorOverlay({
      organizationId,
      nodes,
      edges,
    });

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
      },
      visibility: {
        roleCodes,
        financeNodesIncluded: canSeeFinance,
      },
      nodes: [...nodes.values()],
      edges: [...edges.values()],
    };
  }

  private async addHashAnchorOverlay(input: {
    organizationId: string;
    nodes: Map<string, ProjectGraphNode>;
    edges: Map<string, ProjectGraphEdge>;
  }) {
    const sourceNodes = [...input.nodes.values()].filter(
      (node) =>
        node.entityType !== 'HashRecord' && node.entityType !== 'AuditAnchor',
    );

    if (!sourceNodes.length) {
      return;
    }

    const sourceByRef = new Map(
      sourceNodes.map((node) => [
        sourceRef(node.entityType, node.entityId),
        node,
      ]),
    );
    const sourceFilters = sourceNodes.map((node) => ({
      entityType: node.entityType,
      entityId: node.entityId,
    }));
    const hashRecords = await this.prisma.hashRecord.findMany({
      where: {
        organizationId: input.organizationId,
        OR: sourceFilters,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!hashRecords.length) {
      return;
    }

    const anchors = await this.prisma.auditAnchor.findMany({
      where: {
        organizationId: input.organizationId,
        rootHash: {
          in: hashRecords.map((record) => record.canonicalHash),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const outboxEvents = await this.prisma.outboxEvent.findMany({
      where: {
        organizationId: input.organizationId,
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        OR: sourceFilters.map((filter) => ({
          aggregateType: filter.entityType,
          aggregateId: filter.entityId,
        })),
      },
      include: {
        reconciliationRecord: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const latestAnchorByHash = latestBy(anchors, (anchor) => anchor.rootHash);
    const latestOutboxByRef = latestBy(outboxEvents, (event) =>
      sourceRef(event.aggregateType, event.aggregateId),
    );

    hashRecords.forEach((record, index) => {
      const sourceNode = sourceByRef.get(
        sourceRef(record.entityType, record.entityId),
      );

      if (!sourceNode) {
        return;
      }

      const anchor = latestAnchorByHash.get(record.canonicalHash);
      const outboxEvent = latestOutboxByRef.get(
        sourceRef(record.entityType, record.entityId),
      );
      const hashNodeId = nodeId('HashRecord', record.id);

      input.nodes.set(hashNodeId, {
        id: hashNodeId,
        entityType: 'HashRecord',
        entityId: record.id,
        label: `Hash ${record.canonicalHash.slice(0, 12)}`,
        subtitle: `${record.entityType} verification hash`,
        status: hashRecordStatus(record, anchor, outboxEvent),
        category: 'evidence',
        sourcePath: `/evidence/hashes/${record.id}`,
        position: {
          x: sourceNode.position.x + 180,
          y: sourceNode.position.y + 90 + (index % 3) * 28,
        },
      });
      addGraphEdge(
        input.edges,
        input.nodes,
        hashNodeId,
        sourceNode.id,
        'verifies',
      );

      if (anchor) {
        const anchorNodeId = nodeId('AuditAnchor', anchor.id);

        input.nodes.set(anchorNodeId, {
          id: anchorNodeId,
          entityType: 'AuditAnchor',
          entityId: anchor.id,
          label:
            anchor.anchorType === 'FABRIC_MOCK'
              ? 'Mock anchor'
              : 'Fabric anchor',
          subtitle:
            anchor.fabricTransactionId ||
            anchor.anchorType ||
            'Anchor status record',
          status: anchor.status,
          category: 'evidence',
          sourcePath: `/evidence/hashes/${record.id}`,
          position: {
            x: sourceNode.position.x + 360,
            y: sourceNode.position.y + 90 + (index % 3) * 28,
          },
        });
        addGraphEdge(
          input.edges,
          input.nodes,
          anchorNodeId,
          hashNodeId,
          'anchors',
        );
      }
    });
  }

  private async getActorRoleCodes(organizationId: string, actorUserId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId,
        userId: actorUserId,
        status: 'active',
      },
      include: {
        role: true,
      },
    });

    if (!memberships.length) {
      throw new ForbiddenException('Active organization membership required');
    }

    return memberships.map(
      (membership) => membership.role.code as ActorRoleCode,
    );
  }
}

function requireText(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new BadRequestException(`${field} query parameter is required`);
  }

  return value.trim();
}

function nodeId(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

function addGraphEdge(
  edges: Map<string, ProjectGraphEdge>,
  nodes: Map<string, ProjectGraphNode>,
  sourceNodeId: string,
  targetNodeId: string,
  label: string,
) {
  if (!nodes.has(sourceNodeId) || !nodes.has(targetNodeId)) {
    return;
  }

  const id = `${sourceNodeId}:${label}:${targetNodeId}`;
  edges.set(id, {
    id,
    sourceNodeId,
    targetNodeId,
    label,
  });
}

function sourceRef(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

function latestBy<T>(items: T[], keyFor: (item: T) => string) {
  const map = new Map<string, T>();

  for (const item of items) {
    const key = keyFor(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return map;
}

function hashRecordStatus(
  record: HashRecord,
  anchor: AuditAnchor | undefined,
  outboxEvent: OutboxWithReconciliation | undefined,
) {
  if (anchor) {
    return anchor.status;
  }

  const reconciliationStatus = outboxEvent?.reconciliationRecord?.status;

  if (reconciliationStatus === 'FABRIC_UNAVAILABLE') {
    return 'FABRIC_UNAVAILABLE';
  }

  if (
    reconciliationStatus === 'FAILED' ||
    reconciliationStatus === 'FABRIC_CONFIGURATION_ERROR' ||
    outboxEvent?.status === 'FAILED'
  ) {
    return 'ANCHOR_FAILED';
  }

  if (outboxEvent) {
    return outboxEvent.attempts > 0 ? 'ANCHOR_RETRYING' : 'ANCHOR_PENDING';
  }

  return record.verifiedAt ? 'HASH_VERIFIED' : 'HASH_RECORDED';
}
