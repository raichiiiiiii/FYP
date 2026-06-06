import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AuditAnchor,
  GraphAnnotation,
  HashRecord,
  IntegrationReconciliationRecord,
  OutboxEvent,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  validateGraphAnnotationInput,
  type GraphAnnotationInput,
} from './graph-annotations.contract';

type GraphNodeCategory =
  | 'organization'
  | 'party'
  | 'procurement'
  | 'evidence'
  | 'finance';

type GraphRiskLevel = 'low' | 'medium' | 'high' | 'critical';

type GraphRiskVisibilityScope =
  | 'procurement'
  | 'finance'
  | 'audit'
  | 'operations';

type ProjectGraphRisk = {
  riskLevel: GraphRiskLevel;
  riskReasons: string[];
  sourceEntityIds: string[];
  visibilityScope: GraphRiskVisibilityScope;
};

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
  risk?: ProjectGraphRisk;
};

type ProjectGraphEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
};

type ProjectGraphFilterInput = {
  nodeType?: string;
  riskLevel?: string;
  includeFinance?: string | boolean;
  includeAnchors?: string | boolean;
  status?: string;
};

type SaveGraphViewInput = {
  organizationId?: string;
  actorUserId?: string;
  name?: string;
  filters?: unknown;
  layout?: unknown;
  visibility?: string;
};

type ListGraphViewsInput = {
  organizationId?: string;
  actorUserId?: string;
};

type MutateGraphViewInput = SaveGraphViewInput & {
  viewId?: string;
};

type CreateGraphAnnotationInput = GraphAnnotationInput & {
  organizationId?: string;
  actorUserId?: string;
};

type ListGraphAnnotationsInput = {
  organizationId?: string;
  actorUserId?: string;
  viewId?: string;
  nodeEntityType?: string;
  nodeEntityId?: string;
};

type MutateGraphAnnotationInput = CreateGraphAnnotationInput & {
  annotationId?: string;
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

const financeEntityTypes = new Set([
  'ProcurementOpportunity',
  'MudarabahApplication',
  'MudarabahContract',
  'Disbursement',
  'ProjectLedgerEntry',
  'ProfitLossStatement',
  'ProfitDistribution',
  'ClosurePack',
  'LossException',
]);

const graphSavedViewVisibilities = new Set(['private', 'organization']);

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async createSavedView(input: SaveGraphViewInput) {
    const actor = await this.requireGraphActor(input);
    const name = requireText(input.name, 'name');
    const visibility = normalizeSavedViewVisibility(input.visibility);

    return this.prisma.graphSavedView.create({
      data: {
        organizationId: actor.organizationId,
        ownerUserId: actor.actorUserId,
        name,
        filters: requireJsonObject(input.filters, 'filters'),
        layout: optionalJsonObject(input.layout, 'layout'),
        visibility,
      },
    });
  }

  async listSavedViews(input: ListGraphViewsInput) {
    const actor = await this.requireGraphActor(input);

    return this.prisma.graphSavedView.findMany({
      where: {
        organizationId: actor.organizationId,
        OR: [
          { ownerUserId: actor.actorUserId },
          { visibility: 'organization' },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateSavedView(input: MutateGraphViewInput) {
    const actor = await this.requireGraphActor(input);
    const view = await this.requireSavedView(
      actor.organizationId,
      input.viewId,
    );

    this.assertCanMutateSavedView(actor, view.ownerUserId);

    return this.prisma.graphSavedView.update({
      where: {
        id: view.id,
      },
      data: {
        name:
          input.name === undefined
            ? undefined
            : requireText(input.name, 'name'),
        filters:
          input.filters === undefined
            ? undefined
            : requireJsonObject(input.filters, 'filters'),
        layout:
          input.layout === undefined
            ? undefined
            : optionalJsonObject(input.layout, 'layout'),
        visibility:
          input.visibility === undefined
            ? undefined
            : normalizeSavedViewVisibility(input.visibility),
      },
    });
  }

  async deleteSavedView(input: MutateGraphViewInput) {
    const actor = await this.requireGraphActor(input);
    const view = await this.requireSavedView(
      actor.organizationId,
      input.viewId,
    );

    this.assertCanMutateSavedView(actor, view.ownerUserId);

    return this.prisma.graphSavedView.delete({
      where: {
        id: view.id,
      },
    });
  }

  async createAnnotation(input: CreateGraphAnnotationInput) {
    const actor = await this.requireGraphActor(input);
    const annotation = validateGraphAnnotationInput(input);

    await this.assertAnnotationTargetVisible(actor, annotation);

    return this.toAnnotationDto(
      await this.prisma.graphAnnotation.create({
        data: {
          organizationId: actor.organizationId,
          viewId: 'viewId' in annotation ? annotation.viewId : undefined,
          nodeEntityType:
            'nodeEntityType' in annotation
              ? annotation.nodeEntityType
              : undefined,
          nodeEntityId:
            'nodeEntityId' in annotation ? annotation.nodeEntityId : undefined,
          body: annotation.body,
          visibility: annotation.visibility,
          createdByUserId: actor.actorUserId,
        },
      }),
      actor,
    );
  }

  async listAnnotations(input: ListGraphAnnotationsInput) {
    const actor = await this.requireGraphActor(input);
    const target = validateGraphAnnotationInput({
      viewId: input.viewId,
      nodeEntityType: input.nodeEntityType,
      nodeEntityId: input.nodeEntityId,
      body: 'target-check',
    });

    await this.assertAnnotationTargetVisible(actor, target);

    const targetWhere =
      'viewId' in target
        ? { viewId: target.viewId }
        : {
            nodeEntityType: target.nodeEntityType,
            nodeEntityId: target.nodeEntityId,
          };

    const annotations = await this.prisma.graphAnnotation.findMany({
      where: {
        organizationId: actor.organizationId,
        ...targetWhere,
        OR: [
          { createdByUserId: actor.actorUserId },
          { visibility: 'organization' },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return annotations.map((annotation) =>
      this.toAnnotationDto(annotation, actor),
    );
  }

  async updateAnnotation(input: MutateGraphAnnotationInput) {
    const actor = await this.requireGraphActor(input);
    const annotation = await this.requireAnnotation(
      actor.organizationId,
      input.annotationId,
    );

    this.assertCanMutateAnnotation(actor, annotation);
    await this.assertAnnotationTargetVisible(
      actor,
      annotationTarget(annotation),
    );

    const validated = validateGraphAnnotationInput({
      viewId: annotation.viewId,
      nodeEntityType: annotation.nodeEntityType,
      nodeEntityId: annotation.nodeEntityId,
      body: input.body ?? annotation.body,
      visibility: input.visibility ?? annotation.visibility,
    });

    return this.toAnnotationDto(
      await this.prisma.graphAnnotation.update({
        where: {
          id: annotation.id,
        },
        data: {
          body: validated.body,
          visibility: validated.visibility,
          updatedByUserId: actor.actorUserId,
        },
      }),
      actor,
    );
  }

  async deleteAnnotation(input: MutateGraphAnnotationInput) {
    const actor = await this.requireGraphActor(input);
    const annotation = await this.requireAnnotation(
      actor.organizationId,
      input.annotationId,
    );

    this.assertCanMutateAnnotation(actor, annotation);
    await this.assertAnnotationTargetVisible(
      actor,
      annotationTarget(annotation),
    );

    return this.toAnnotationDto(
      await this.prisma.graphAnnotation.delete({
        where: {
          id: annotation.id,
        },
      }),
      actor,
    );
  }

  async getProjectGraph(input: {
    organizationId?: string;
    actorUserId?: string;
    projectId: string;
    filters?: ProjectGraphFilterInput;
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
                        receipts: true,
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
                receipts: true,
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
                evidenceChecklist: {
                  include: {
                    items: true,
                  },
                },
                lossExceptions: true,
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
      risk: projectStatusRisk(project.status, project.id),
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
        risk: workflowStatusRisk({
          status: requisition.status,
          sourceEntityId: requisition.id,
          visibilityScope: 'procurement',
          pendingReason: 'Requisition is waiting for procurement action.',
          blockedReason: 'Requisition is blocked or rejected.',
        }),
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
          risk: workflowStatusRisk({
            status: rfq.status,
            sourceEntityId: rfq.id,
            visibilityScope: 'procurement',
            pendingReason: 'RFQ is still open for sourcing action.',
            blockedReason: 'RFQ is blocked, cancelled, or failed.',
          }),
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
          risk: purchaseOrderRisk(purchaseOrder),
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
          risk: workflowStatusRisk({
            status: opportunity.status,
            sourceEntityId: opportunity.id,
            visibilityScope: 'finance',
            pendingReason:
              'Finance opportunity is waiting for application or review action.',
            blockedReason: 'Finance opportunity is blocked or rejected.',
          }),
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
            risk: applicationRisk(application),
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
    const filteredGraph = filterProjectGraphView(
      [...nodes.values()],
      [...edges.values()],
      input.filters,
    );

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
      nodes: filteredGraph.nodes,
      edges: filteredGraph.edges,
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
        risk: hashAnchorRisk(record, anchor, outboxEvent),
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
          risk: anchorRisk(anchor, record.id),
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
    const memberships = await this.getActiveMemberships(
      organizationId,
      actorUserId,
    );

    return memberships.map(
      (membership) => membership.role.code as ActorRoleCode,
    );
  }

  private async requireGraphActor(input: {
    organizationId?: string;
    actorUserId?: string;
  }) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const actorUserId = requireText(input.actorUserId, 'actorUserId');
    const memberships = await this.getActiveMemberships(
      organizationId,
      actorUserId,
    );

    return {
      organizationId,
      actorUserId,
      roleCodes: memberships.map(
        (membership) => membership.role.code as ActorRoleCode,
      ),
    };
  }

  private async getActiveMemberships(
    organizationId: string,
    actorUserId: string,
  ) {
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

    return memberships;
  }

  private async requireSavedView(
    organizationId: string,
    viewId: string | undefined,
  ) {
    const id = requireText(viewId, 'viewId');
    const view = await this.prisma.graphSavedView.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!view) {
      throw new NotFoundException('Graph saved view not found');
    }

    return view;
  }

  private assertCanMutateSavedView(
    actor: {
      actorUserId: string;
      roleCodes: ActorRoleCode[];
    },
    ownerUserId: string,
  ) {
    if (
      actor.actorUserId !== ownerUserId &&
      !actor.roleCodes.includes('ORG_ADMIN')
    ) {
      throw new ForbiddenException('Graph saved view mutation denied');
    }
  }

  private async assertAnnotationTargetVisible(
    actor: {
      organizationId: string;
      actorUserId: string;
      roleCodes: ActorRoleCode[];
    },
    target: {
      viewId?: string;
      nodeEntityType?: string;
      nodeEntityId?: string;
    },
  ) {
    if (target.viewId) {
      await this.requireVisibleSavedView(actor, target.viewId);
      return;
    }

    await this.assertNodeEntityVisible(
      actor,
      requireText(target.nodeEntityType, 'nodeEntityType'),
      requireText(target.nodeEntityId, 'nodeEntityId'),
    );
  }

  private async requireVisibleSavedView(
    actor: {
      organizationId: string;
      actorUserId: string;
    },
    viewId: string,
  ) {
    const view = await this.prisma.graphSavedView.findFirst({
      where: {
        id: viewId,
        organizationId: actor.organizationId,
        OR: [
          { ownerUserId: actor.actorUserId },
          { visibility: 'organization' },
        ],
      },
    });

    if (!view) {
      throw new ForbiddenException('Graph saved view is not visible');
    }

    return view;
  }

  private async assertNodeEntityVisible(
    actor: {
      organizationId: string;
      roleCodes: ActorRoleCode[];
    },
    entityType: string,
    entityId: string,
  ) {
    if (financeEntityTypes.has(entityType) && !this.canSeeFinance(actor)) {
      throw new ForbiddenException('Graph annotation target is not visible');
    }

    if (entityType === 'HashRecord') {
      const hashRecord = await this.prisma.hashRecord.findFirst({
        where: {
          id: entityId,
          organizationId: actor.organizationId,
        },
        select: {
          entityType: true,
          entityId: true,
        },
      });

      if (!hashRecord) {
        throw new NotFoundException('Graph annotation target not found');
      }

      await this.assertNodeEntityVisible(
        actor,
        hashRecord.entityType,
        hashRecord.entityId,
      );
      return;
    }

    if (entityType === 'AuditAnchor') {
      const anchor = await this.prisma.auditAnchor.findFirst({
        where: {
          id: entityId,
          organizationId: actor.organizationId,
        },
        select: {
          rootHash: true,
        },
      });

      if (!anchor) {
        throw new NotFoundException('Graph annotation target not found');
      }

      const visibleHashRecord = await this.prisma.hashRecord.findFirst({
        where: {
          organizationId: actor.organizationId,
          canonicalHash: anchor.rootHash,
          entityType: this.canSeeFinance(actor)
            ? undefined
            : { notIn: [...financeEntityTypes] },
        },
        select: {
          id: true,
        },
      });

      if (!visibleHashRecord) {
        throw new ForbiddenException('Graph annotation target is not visible');
      }

      return;
    }

    await this.assertKnownEntityExists(
      actor.organizationId,
      entityType,
      entityId,
    );
  }

  private async assertKnownEntityExists(
    organizationId: string,
    entityType: string,
    entityId: string,
  ) {
    const exists = await this.knownEntityExists(
      organizationId,
      entityType,
      entityId,
    );

    if (!exists) {
      throw new NotFoundException('Graph annotation target not found');
    }
  }

  private knownEntityExists(
    organizationId: string,
    entityType: string,
    entityId: string,
  ) {
    switch (entityType) {
      case 'Organization':
      case 'BuyerCustomer':
        if (entityId !== organizationId) {
          return Promise.resolve(false);
        }

        return this.prisma.organization
          .count({
            where: {
              id: entityId,
            },
          })
          .then(Boolean);
      case 'Project':
        return this.prisma.project
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'Supplier':
        return this.prisma.supplier
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'Requisition':
        return this.prisma.requisition
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'RFQ':
        return this.prisma.rFQ
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'Quotation':
        return this.prisma.quotation
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'PurchaseOrder':
        return this.prisma.purchaseOrder
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'Invoice':
        return this.prisma.invoice
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'EvidencePack':
        return this.prisma.evidencePack
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'ProcurementOpportunity':
        return this.prisma.procurementOpportunity
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'MudarabahApplication':
        return this.prisma.mudarabahApplication
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'MudarabahContract':
        return this.prisma.mudarabahContract
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      case 'ClosurePack':
        return this.prisma.closurePack
          .count({ where: { id: entityId, organizationId } })
          .then(Boolean);
      default:
        throw new BadRequestException('Unsupported graph annotation target');
    }
  }

  private async requireAnnotation(
    organizationId: string,
    annotationId: string | undefined,
  ) {
    const id = requireText(annotationId, 'annotationId');
    const annotation = await this.prisma.graphAnnotation.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!annotation) {
      throw new NotFoundException('Graph annotation not found');
    }

    return annotation;
  }

  private assertCanMutateAnnotation(
    actor: {
      actorUserId: string;
      roleCodes: ActorRoleCode[];
    },
    annotation: Pick<GraphAnnotation, 'createdByUserId'>,
  ) {
    if (
      actor.actorUserId !== annotation.createdByUserId &&
      !actor.roleCodes.includes('ORG_ADMIN')
    ) {
      throw new ForbiddenException('Graph annotation mutation denied');
    }
  }

  private canSeeFinance(actor: { roleCodes: ActorRoleCode[] }) {
    return actor.roleCodes.some((roleCode) =>
      financeVisibleRoles.has(roleCode),
    );
  }

  private toAnnotationDto(
    annotation: GraphAnnotation,
    actor: { actorUserId: string; roleCodes: ActorRoleCode[] },
  ) {
    return {
      id: annotation.id,
      organizationId: annotation.organizationId,
      viewId: annotation.viewId,
      nodeEntityType: annotation.nodeEntityType,
      nodeEntityId: annotation.nodeEntityId,
      body: annotation.body,
      visibility: annotation.visibility,
      createdByUserId: annotation.createdByUserId,
      updatedByUserId: annotation.updatedByUserId,
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt,
      canEdit:
        annotation.createdByUserId === actor.actorUserId ||
        actor.roleCodes.includes('ORG_ADMIN'),
    };
  }
}

function requireText(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new BadRequestException(`${field} query parameter is required`);
  }

  return value.trim();
}

function requireJsonObject(
  value: unknown,
  field: string,
): Prisma.InputJsonObject {
  if (!isJsonObject(value)) {
    throw new BadRequestException(`${field} must be a JSON object`);
  }

  return value as Prisma.InputJsonObject;
}

function optionalJsonObject(
  value: unknown,
  field: string,
): Prisma.InputJsonObject | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireJsonObject(value, field);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSavedViewVisibility(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() || 'private';

  if (!graphSavedViewVisibilities.has(normalized)) {
    throw new BadRequestException('visibility must be private or organization');
  }

  return normalized;
}

function annotationTarget(annotation: GraphAnnotation) {
  if (annotation.viewId) {
    return {
      viewId: annotation.viewId,
    };
  }

  return {
    nodeEntityType: annotation.nodeEntityType ?? undefined,
    nodeEntityId: annotation.nodeEntityId ?? undefined,
  };
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

function filterProjectGraphView(
  nodes: ProjectGraphNode[],
  edges: ProjectGraphEdge[],
  filters: ProjectGraphFilterInput | undefined,
) {
  const normalizedFilters = normalizeGraphFilters(filters);
  const visibleNodeIds = new Set<string>();
  const filteredNodes = nodes.filter((node) => {
    if (!normalizedFilters.includeFinance && node.category === 'finance') {
      return false;
    }

    if (
      !normalizedFilters.includeAnchors &&
      (node.entityType === 'HashRecord' || node.entityType === 'AuditAnchor')
    ) {
      return false;
    }

    if (
      normalizedFilters.nodeType &&
      graphNodeTypeForFilter(node) !== normalizedFilters.nodeType
    ) {
      return false;
    }

    if (
      normalizedFilters.riskLevel &&
      (node.risk?.riskLevel ?? 'low') !== normalizedFilters.riskLevel
    ) {
      return false;
    }

    if (
      normalizedFilters.statuses.length &&
      !normalizedFilters.statuses.includes(normalizeStatus(node.status))
    ) {
      return false;
    }

    visibleNodeIds.add(node.id);
    return true;
  });
  const filteredEdges = edges.filter(
    (edge) =>
      visibleNodeIds.has(edge.sourceNodeId) &&
      visibleNodeIds.has(edge.targetNodeId),
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

function normalizeGraphFilters(filters: ProjectGraphFilterInput | undefined) {
  return {
    nodeType: normalizeFilterValue(filters?.nodeType),
    riskLevel: normalizeRiskFilter(filters?.riskLevel),
    includeFinance: parseBooleanFilter(filters?.includeFinance, true),
    includeAnchors: parseBooleanFilter(filters?.includeAnchors, true),
    statuses: normalizeStatusList(filters?.status),
  };
}

function normalizeFilterValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized && normalized !== 'all' ? normalized : undefined;
}

function normalizeRiskFilter(
  value: string | undefined,
): GraphRiskLevel | undefined {
  const normalized = normalizeFilterValue(value);

  return normalized && normalized in riskRank
    ? (normalized as GraphRiskLevel)
    : undefined;
}

function parseBooleanFilter(
  value: string | boolean | undefined,
  defaultValue: boolean,
) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function normalizeStatusList(value: string | undefined) {
  return (
    value
      ?.split(',')
      .map((status) => normalizeStatus(status))
      .filter((status) => status && status !== 'ALL') ?? []
  );
}

function graphNodeTypeForFilter(node: ProjectGraphNode) {
  if (node.entityType === 'Organization') {
    return 'organization';
  }

  if (node.entityType === 'Supplier') {
    return 'supplier';
  }

  if (node.entityType === 'BuyerCustomer') {
    return 'buyer';
  }

  if (node.entityType === 'ProcurementOpportunity') {
    return 'opportunity';
  }

  if (node.entityType === 'MudarabahApplication') {
    return 'application';
  }

  if (node.entityType === 'HashRecord') {
    return 'hash_record';
  }

  if (node.entityType === 'AuditAnchor') {
    return 'anchor';
  }

  return 'document';
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

const riskRank: Record<GraphRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const blockedStatuses = new Set([
  'BLOCKED',
  'CANCELLED',
  'CANCELED',
  'FAILED',
  'REJECTED',
  'SUSPENDED',
  'VOID',
]);

const pendingStatuses = new Set([
  'DRAFT',
  'OPEN',
  'PENDING',
  'PENDING_APPROVAL',
  'PENDING_SHARIAH',
  'PENDING_SIGNATURE',
  'READY_FOR_APPLICATION',
  'SUBMITTED',
  'UNDER_REVIEW',
]);

const anchorPendingStatuses = new Set([
  'ANCHOR_PENDING',
  'ANCHOR_REQUESTED',
  'ANCHOR_RETRYING',
  'FABRIC_ANCHOR_REQUESTED',
]);

const anchorFailedStatuses = new Set([
  'ANCHOR_FAILED',
  'FAILED',
  'FABRIC_CONFIGURATION_ERROR',
  'FABRIC_UNAVAILABLE',
]);

const unresolvedLossExceptionStatuses = new Set([
  'OPEN',
  'UNDER_REVIEW',
  'CLASSIFIED',
]);

function projectStatusRisk(
  status: string | null | undefined,
  sourceEntityId: string,
) {
  return workflowStatusRisk({
    status,
    sourceEntityId,
    visibilityScope: 'procurement',
    pendingReason: 'Project is active and still has workflow work in progress.',
    blockedReason: 'Project is blocked or cancelled.',
  });
}

function workflowStatusRisk(input: {
  status: string | null | undefined;
  sourceEntityId: string;
  visibilityScope: GraphRiskVisibilityScope;
  pendingReason: string;
  blockedReason: string;
}): ProjectGraphRisk | undefined {
  const status = normalizeStatus(input.status);

  if (!status) {
    return undefined;
  }

  if (blockedStatuses.has(status)) {
    return makeRisk({
      riskLevel: 'high',
      reason: input.blockedReason,
      sourceEntityIds: [input.sourceEntityId],
      visibilityScope: input.visibilityScope,
    });
  }

  if (pendingStatuses.has(status)) {
    return makeRisk({
      riskLevel: status === 'DRAFT' ? 'low' : 'medium',
      reason: input.pendingReason,
      sourceEntityIds: [input.sourceEntityId],
      visibilityScope: input.visibilityScope,
    });
  }

  return undefined;
}

function purchaseOrderRisk(purchaseOrder: {
  id: string;
  status?: string | null;
  totalAmount?: number | null;
  receipts?: Array<{ id: string }>;
  invoices?: Array<{ amount?: number | null; status?: string | null }>;
}): ProjectGraphRisk | undefined {
  const workflowRisk = workflowStatusRisk({
    status: purchaseOrder.status,
    sourceEntityId: purchaseOrder.id,
    visibilityScope: 'procurement',
    pendingReason: 'Purchase order is issued but matching remains incomplete.',
    blockedReason: 'Purchase order is blocked, cancelled, or failed.',
  });
  const invoices = purchaseOrder.invoices ?? [];
  const receipts = purchaseOrder.receipts ?? [];
  const invoiceTotal = invoices.reduce(
    (total, invoice) => total + Number(invoice.amount ?? 0),
    0,
  );
  const matchingRisks: ProjectGraphRisk[] = [];

  if (invoices.length > 0 && receipts.length === 0) {
    matchingRisks.push(
      makeRisk({
        riskLevel: 'high',
        reason:
          'Invoice exists before a recorded receipt; matching needs review.',
        sourceEntityIds: [purchaseOrder.id],
        visibilityScope: 'procurement',
      }),
    );
  }

  if (
    purchaseOrder.totalAmount &&
    invoiceTotal > 0 &&
    invoiceTotal > purchaseOrder.totalAmount
  ) {
    matchingRisks.push(
      makeRisk({
        riskLevel: 'high',
        reason: 'Invoice amount exceeds purchase order value.',
        sourceEntityIds: [purchaseOrder.id],
        visibilityScope: 'procurement',
      }),
    );
  }

  return combineRisks(workflowRisk, ...matchingRisks);
}

function applicationRisk(application: {
  id: string;
  status?: string | null;
  evidenceChecklist?: {
    status?: string | null;
    items?: Array<{ status?: string | null }>;
  } | null;
  lossExceptions?: Array<{ status?: string | null }>;
}): ProjectGraphRisk | undefined {
  const risks: Array<ProjectGraphRisk | undefined> = [
    workflowStatusRisk({
      status: application.status,
      sourceEntityId: application.id,
      visibilityScope: 'finance',
      pendingReason:
        'Finance application is waiting for evidence or reviewer action.',
      blockedReason: 'Finance application is blocked or rejected.',
    }),
  ];
  const checklist = application.evidenceChecklist;

  if (!checklist) {
    risks.push(
      makeRisk({
        riskLevel: 'high',
        reason: 'Evidence checklist has not been created for this application.',
        sourceEntityIds: [application.id],
        visibilityScope: 'finance',
      }),
    );
  } else if (
    normalizeStatus(checklist.status) !== 'COMPLETED' ||
    (checklist.items ?? []).some(
      (item) => normalizeStatus(item.status) !== 'COMPLETED',
    )
  ) {
    risks.push(
      makeRisk({
        riskLevel: 'high',
        reason:
          'Finance evidence checklist still has missing or incomplete items.',
        sourceEntityIds: [application.id],
        visibilityScope: 'finance',
      }),
    );
  }

  if (
    (application.lossExceptions ?? []).some((lossException) =>
      unresolvedLossExceptionStatuses.has(
        normalizeStatus(lossException.status),
      ),
    )
  ) {
    risks.push(
      makeRisk({
        riskLevel: 'critical',
        reason:
          'Unresolved loss exception blocks closure until reviewer resolution.',
        sourceEntityIds: [application.id],
        visibilityScope: 'finance',
      }),
    );
  }

  return combineRisks(...risks);
}

function hashAnchorRisk(
  record: HashRecord,
  anchor: AuditAnchor | undefined,
  outboxEvent: OutboxWithReconciliation | undefined,
) {
  const status = normalizeStatus(hashRecordStatus(record, anchor, outboxEvent));

  if (anchorFailedStatuses.has(status)) {
    return makeRisk({
      riskLevel: 'high',
      reason:
        'Fabric anchoring failed or is unavailable; this is not verified on-chain proof.',
      sourceEntityIds: [record.entityId, record.id],
      visibilityScope: 'operations',
    });
  }

  if (anchorPendingStatuses.has(status)) {
    return makeRisk({
      riskLevel: 'medium',
      reason: 'Fabric anchoring is still pending or retrying.',
      sourceEntityIds: [record.entityId, record.id],
      visibilityScope: 'audit',
    });
  }

  if (anchor?.anchorType === 'FABRIC_MOCK') {
    return makeRisk({
      riskLevel: 'medium',
      reason: 'Mock anchor is not real Fabric proof.',
      sourceEntityIds: [record.entityId, record.id],
      visibilityScope: 'audit',
    });
  }

  return undefined;
}

function anchorRisk(anchor: AuditAnchor, sourceEntityId: string) {
  const status = normalizeStatus(anchor.status);

  if (anchorFailedStatuses.has(status)) {
    return makeRisk({
      riskLevel: 'high',
      reason: 'Anchor status requires operator review.',
      sourceEntityIds: [sourceEntityId, anchor.id],
      visibilityScope: 'operations',
    });
  }

  if (anchorPendingStatuses.has(status)) {
    return makeRisk({
      riskLevel: 'medium',
      reason: 'Anchor transaction is not yet verified as complete.',
      sourceEntityIds: [sourceEntityId, anchor.id],
      visibilityScope: 'audit',
    });
  }

  if (anchor.anchorType === 'FABRIC_MOCK') {
    return makeRisk({
      riskLevel: 'medium',
      reason: 'Mock anchor is not real Fabric proof.',
      sourceEntityIds: [sourceEntityId, anchor.id],
      visibilityScope: 'audit',
    });
  }

  return undefined;
}

function combineRisks(
  ...risks: Array<ProjectGraphRisk | undefined>
): ProjectGraphRisk | undefined {
  const presentRisks = risks.filter(
    (risk): risk is ProjectGraphRisk => risk !== undefined,
  );

  if (!presentRisks.length) {
    return undefined;
  }

  const strongest = presentRisks.reduce((current, candidate) =>
    riskRank[candidate.riskLevel] > riskRank[current.riskLevel]
      ? candidate
      : current,
  );

  return {
    riskLevel: strongest.riskLevel,
    riskReasons: unique(presentRisks.flatMap((risk) => risk.riskReasons)),
    sourceEntityIds: unique(
      presentRisks.flatMap((risk) => risk.sourceEntityIds),
    ),
    visibilityScope: strongest.visibilityScope,
  };
}

function makeRisk(input: {
  riskLevel: GraphRiskLevel;
  reason: string;
  sourceEntityIds: string[];
  visibilityScope: GraphRiskVisibilityScope;
}): ProjectGraphRisk {
  return {
    riskLevel: input.riskLevel,
    riskReasons: [input.reason],
    sourceEntityIds: input.sourceEntityIds,
    visibilityScope: input.visibilityScope,
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeStatus(status: string | null | undefined) {
  return status?.trim().toUpperCase() ?? '';
}
