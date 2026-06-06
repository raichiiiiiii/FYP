import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import {
  numericValue,
  optionalText,
  positiveNumber,
  requireText,
} from './finance.service-utils';
import {
  assertLossExceptionTransition,
  getNextLossExceptionStatuses,
  type LossExceptionStatus,
  normalizeLossExceptionClassification,
  normalizeLossExceptionStatus,
} from './loss-exceptions/loss-exception-lifecycle';

export type CreateOpportunityInput = {
  organizationId: string;
  actorUserId?: string;
  projectId: string;
  requisitionId?: string;
  purchaseOrderId?: string;
  evidencePackId?: string;
  title?: string;
  description?: string;
  estimatedCapital?: number | string;
  expectedProfit?: number | string;
  currency?: string;
};

export type CreateApplicationInput = {
  organizationId: string;
  actorUserId?: string;
  opportunityId: string;
  applicantUserId?: string;
  requestedCapital?: number | string;
  capitalProviderRatio?: number | string;
  entrepreneurRatio?: number | string;
  currency?: string;
  purpose?: string;
};

export type ActorInput = {
  actorUserId?: string;
};

type FinanceActorRole =
  | 'ORG_ADMIN'
  | 'PROCUREMENT_OFFICER'
  | 'FINANCIER_USER'
  | 'FINANCE_ACCOUNTANT'
  | 'SHARIAH_REVIEWER'
  | 'AUDITOR';

export type CreateEvidenceChecklistInput = ActorInput;

export type CompleteChecklistItemInput = ActorInput & {
  evidenceItemId?: string;
  metadata?: Prisma.InputJsonObject;
};

export type CreateDueDiligenceInput = ActorInput & {
  reviewerUserId?: string;
  status?: string;
  riskRating?: string;
  decision?: string;
  notes?: string;
};

export type CreateShariahReviewInput = ActorInput & {
  reviewerUserId?: string;
  status?: string;
  decision?: string;
  opinion?: string;
  notes?: string;
};

export type RejectApplicationInput = ActorInput & {
  reason?: string;
};

export type CreateContractInput = {
  organizationId: string;
  actorUserId?: string;
  applicationId: string;
  documentId?: string;
  contractNumber?: string;
  restrictedUse?: string;
};

export type GenerateContractDocumentInput = ActorInput & {
  signerEmail?: string;
};

export type CreateDisbursementInput = {
  organizationId: string;
  actorUserId?: string;
  applicationId: string;
  contractId?: string;
  amount?: number | string;
  currency?: string;
  reference?: string;
  disbursedAt?: string;
};

export type CreateLedgerEntryInput = {
  organizationId: string;
  actorUserId?: string;
  applicationId: string;
  entryType: string;
  description: string;
  amount: number | string;
  currency?: string;
  occurredAt?: string;
};

export type CreateProfitLossStatementInput = {
  organizationId: string;
  actorUserId?: string;
  applicationId: string;
  revenue?: number | string;
  costs?: number | string;
  periodStart?: string;
  periodEnd?: string;
};

export type CreateClosureInput = {
  organizationId: string;
  actorUserId?: string;
  applicationId: string;
  evidencePackId?: string;
};

export type CreateLossExceptionInput = {
  organizationId: string;
  actorUserId?: string;
  applicationId: string;
  statementId?: string;
  classification?: string;
  amount: number | string;
  notes?: string;
  evidenceRefs?: Prisma.InputJsonValue;
};

export type AttachLossExceptionEvidenceInput = ActorInput & {
  evidenceRefs?: Prisma.InputJsonValue;
  notes?: string;
};

export type ClassifyLossExceptionInput = ActorInput & {
  reviewerUserId?: string;
  classification: string;
  decision?: string;
  rationale: string;
};

export type ResolveLossExceptionInput = ActorInput & {
  notes?: string;
};

const opportunityInclude = {
  project: true,
  requisition: true,
  purchaseOrder: {
    include: {
      supplier: true,
      receipts: true,
      invoices: true,
    },
  },
  evidencePack: {
    include: {
      items: true,
    },
  },
  applications: {
    orderBy: {
      createdAt: 'desc',
    },
  },
} satisfies Prisma.ProcurementOpportunityInclude;

const applicationInclude = {
  opportunity: {
    include: {
      project: true,
      evidencePack: {
        include: {
          items: true,
        },
      },
      purchaseOrder: {
        include: {
          supplier: true,
          receipts: true,
          invoices: true,
        },
      },
    },
  },
  applicantUser: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
  evidenceChecklist: {
    include: {
      items: {
        include: {
          evidenceItem: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  },
  dueDiligenceReports: {
    include: {
      reviewerUser: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  shariahReviews: {
    include: {
      reviewerUser: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  contracts: {
    orderBy: {
      createdAt: 'desc',
    },
  },
  disbursements: {
    orderBy: {
      createdAt: 'desc',
    },
  },
  ledgerEntries: {
    orderBy: {
      occurredAt: 'asc',
    },
  },
  profitLossStatements: {
    include: {
      distributions: true,
      lossExceptions: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  lossExceptions: {
    orderBy: {
      createdAt: 'desc',
    },
  },
  closurePacks: {
    orderBy: {
      createdAt: 'desc',
    },
  },
} satisfies Prisma.MudarabahApplicationInclude;

const lossExceptionInclude = {
  application: {
    include: {
      opportunity: {
        include: {
          project: true,
        },
      },
    },
  },
  statement: true,
  reviewerUser: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
} satisfies Prisma.LossExceptionInclude;

const REQUIRED_CHECKLIST_ITEMS = [
  ['PROJECT_SUMMARY', 'Project summary'],
  ['SUPPLIER_PROFILE', 'Supplier profile'],
  ['REQUISITION', 'Approved requisition'],
  ['APPROVAL', 'Approval evidence'],
  ['RFQ', 'RFQ evidence'],
  ['QUOTATION', 'Quotation evidence'],
  ['PURCHASE_ORDER', 'Purchase order evidence'],
  ['RECEIPT', 'Receipt evidence'],
  ['INVOICE', 'Invoice evidence'],
] as const;

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
    private readonly outbox: OutboxService,
  ) {}

  async createOpportunity(input: CreateOpportunityInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const projectId = requireText(input.projectId, 'projectId');
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== organizationId) {
      throw new BadRequestException(
        'Project does not belong to the organization',
      );
    }

    const [requisition, purchaseOrder, evidencePack] = await Promise.all([
      input.requisitionId
        ? this.prisma.requisition.findUnique({
            where: { id: input.requisitionId },
          })
        : Promise.resolve(null),
      input.purchaseOrderId
        ? this.prisma.purchaseOrder.findUnique({
            where: { id: input.purchaseOrderId },
          })
        : Promise.resolve(null),
      input.evidencePackId
        ? this.prisma.evidencePack.findUnique({
            where: { id: input.evidencePackId },
          })
        : this.prisma.evidencePack.findFirst({
            where: {
              organizationId,
              projectId,
            },
            orderBy: {
              createdAt: 'desc',
            },
          }),
    ]);

    this.assertOptionalOrgRecord(
      organizationId,
      requisition?.organizationId,
      'Requisition',
    );
    this.assertOptionalOrgRecord(
      organizationId,
      purchaseOrder?.organizationId,
      'Purchase order',
    );
    this.assertOptionalOrgRecord(
      organizationId,
      evidencePack?.organizationId,
      'Evidence pack',
    );
    this.requireRevenueGeneratingOpportunity({
      purchaseOrder,
      evidencePack,
      estimatedCapital: numericValue(
        input.estimatedCapital,
        'estimatedCapital',
        project.budget || purchaseOrder?.totalAmount || 0,
      ),
      expectedProfit:
        input.expectedProfit === undefined
          ? undefined
          : numericValue(input.expectedProfit, 'expectedProfit'),
    });

    const opportunity = await this.prisma.procurementOpportunity.create({
      data: {
        organizationId,
        projectId,
        requisitionId: input.requisitionId,
        purchaseOrderId: input.purchaseOrderId,
        evidencePackId: evidencePack?.id,
        title:
          optionalText(input.title) || `${project.name} finance opportunity`,
        description: optionalText(input.description),
        estimatedCapital: numericValue(
          input.estimatedCapital,
          'estimatedCapital',
          project.budget || purchaseOrder?.totalAmount || 0,
        ),
        expectedProfit:
          input.expectedProfit === undefined
            ? undefined
            : numericValue(input.expectedProfit, 'expectedProfit'),
        currency: optionalText(input.currency) || 'MYR',
      },
      include: opportunityInclude,
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'PROCUREMENT_OPPORTUNITY_CREATED',
      entityType: 'ProcurementOpportunity',
      entityId: opportunity.id,
      metadata: {
        projectId,
        evidencePackId: opportunity.evidencePackId,
        estimatedCapital: opportunity.estimatedCapital,
      },
    });

    return opportunity;
  }

  listOpportunities(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.procurementOpportunity.findMany({
      where: { organizationId },
      include: opportunityInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOpportunity(id: string) {
    const opportunity = await this.prisma.procurementOpportunity.findUnique({
      where: { id },
      include: opportunityInclude,
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return opportunity;
  }

  async createApplication(input: CreateApplicationInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const opportunity = await this.getOpportunity(input.opportunityId);

    if (opportunity.organizationId !== organizationId) {
      throw new BadRequestException(
        'Opportunity does not belong to the organization',
      );
    }
    this.requireExistingOpportunityEligible(opportunity);

    const requestedCapital = positiveNumber(
      input.requestedCapital,
      'requestedCapital',
      opportunity.estimatedCapital,
    );
    const capitalProviderRatio = numericValue(
      input.capitalProviderRatio,
      'capitalProviderRatio',
      0.6,
    );
    const entrepreneurRatio = numericValue(
      input.entrepreneurRatio,
      'entrepreneurRatio',
      1 - capitalProviderRatio,
    );

    if (capitalProviderRatio + entrepreneurRatio <= 0) {
      throw new BadRequestException('Profit share ratios must be positive');
    }

    const application = await this.prisma.mudarabahApplication.create({
      data: {
        organizationId,
        opportunityId: opportunity.id,
        applicantUserId:
          optionalText(input.applicantUserId) ||
          optionalText(input.actorUserId),
        requestedCapital,
        capitalProviderRatio,
        entrepreneurRatio,
        currency: optionalText(input.currency) || opportunity.currency,
        purpose:
          optionalText(input.purpose) ||
          `Restricted mudarabah capital for ${opportunity.title}`,
      },
      include: applicationInclude,
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MUDARABAH_APPLICATION_CREATED',
      entityType: 'MudarabahApplication',
      entityId: application.id,
      metadata: {
        opportunityId: opportunity.id,
        requestedCapital,
      },
    });

    return application;
  }

  async getApplication(id: string) {
    const application = await this.prisma.mudarabahApplication.findUnique({
      where: { id },
      include: applicationInclude,
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  listApplications(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.mudarabahApplication.findMany({
      where: { organizationId },
      include: applicationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitApplication(id: string, input: ActorInput) {
    const application = await this.getApplication(id);

    if (application.status !== 'DRAFT') {
      throw new BadRequestException('Only draft applications can be submitted');
    }

    const submitted = await this.prisma.mudarabahApplication.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: applicationInclude,
    });

    await this.recordFinanceEvent({
      organizationId: submitted.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MUDARABAH_APPLICATION_SUBMITTED',
      entityType: 'MudarabahApplication',
      entityId: submitted.id,
      metadata: {
        status: submitted.status,
      },
    });

    return submitted;
  }

  async createEvidenceChecklist(
    applicationId: string,
    input: CreateEvidenceChecklistInput,
  ) {
    const application = await this.getApplication(applicationId);
    await this.requireActorRole(
      application.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'PROCUREMENT_OFFICER', 'FINANCIER_USER'],
      'Evidence checklist generation',
    );

    if (!['SUBMITTED', 'EVIDENCE_PENDING'].includes(application.status)) {
      throw new BadRequestException(
        'Evidence checklist requires a submitted application',
      );
    }

    if (application.evidenceChecklist) {
      return application.evidenceChecklist;
    }

    const evidenceItems = application.opportunity.evidencePack?.items || [];
    const checklistItems = REQUIRED_CHECKLIST_ITEMS.map(
      ([requiredCode, label]) => {
        const matchingEvidence = evidenceItems.find(
          (item) => item.evidenceType === requiredCode,
        );

        return {
          requiredCode,
          label,
          evidenceItemId: matchingEvidence?.id,
          status: matchingEvidence ? 'COMPLETED' : 'PENDING',
          completedAt: matchingEvidence ? new Date() : undefined,
          metadata: matchingEvidence
            ? {
                evidenceItemId: matchingEvidence.id,
                sourceEvidencePackId: application.opportunity.evidencePackId,
              }
            : undefined,
        };
      },
    );
    const allItemsInitiallyComplete = checklistItems.every(
      (item) => item.status === 'COMPLETED',
    );
    const checklist = await this.prisma.evidenceChecklist.create({
      data: {
        organizationId: application.organizationId,
        applicationId: application.id,
        status: allItemsInitiallyComplete ? 'COMPLETED' : 'PENDING',
        items: {
          create: checklistItems,
        },
      },
      include: {
        items: {
          include: {
            evidenceItem: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    const allComplete = checklist.items.every(
      (item) => item.status === 'COMPLETED',
    );
    const updated = await this.prisma.mudarabahApplication.update({
      where: { id: application.id },
      data: {
        status: allComplete ? 'DUE_DILIGENCE_IN_REVIEW' : 'EVIDENCE_PENDING',
      },
      include: applicationInclude,
    });

    await this.recordFinanceEvent({
      organizationId: application.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'EVIDENCE_CHECKLIST_GENERATED',
      entityType: 'EvidenceChecklist',
      entityId: checklist.id,
      metadata: {
        applicationId: application.id,
        completedItems: checklist.items.filter(
          (item) => item.status === 'COMPLETED',
        ).length,
        requiredItems: checklist.items.length,
      },
    });

    return updated.evidenceChecklist;
  }

  async completeChecklistItem(
    checklistItemId: string,
    input: CompleteChecklistItemInput,
  ) {
    const current = await this.prisma.evidenceChecklistItem.findUnique({
      where: { id: checklistItemId },
      include: {
        checklist: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Checklist item not found');
    }
    await this.requireActorRole(
      current.checklist.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'PROCUREMENT_OFFICER', 'FINANCIER_USER'],
      'Evidence checklist completion',
    );

    const updatedItem = await this.prisma.evidenceChecklistItem.update({
      where: { id: checklistItemId },
      data: {
        evidenceItemId:
          optionalText(input.evidenceItemId) || current.evidenceItemId,
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: input.metadata,
      },
    });

    await this.refreshChecklistStatus(current.checklistId);

    await this.recordFinanceEvent({
      organizationId: current.checklist.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'EVIDENCE_CHECKLIST_ITEM_COMPLETED',
      entityType: 'EvidenceChecklistItem',
      entityId: updatedItem.id,
      metadata: {
        checklistId: current.checklistId,
        requiredCode: updatedItem.requiredCode,
      },
    });

    return updatedItem;
  }

  async createDueDiligence(
    applicationId: string,
    input: CreateDueDiligenceInput,
  ) {
    const application = await this.getApplication(applicationId);
    await this.requireActorRole(
      application.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Due diligence review',
    );
    this.requireChecklistComplete(application);

    const report = await this.prisma.dueDiligenceReport.create({
      data: {
        organizationId: application.organizationId,
        applicationId: application.id,
        reviewerUserId:
          optionalText(input.reviewerUserId) || optionalText(input.actorUserId),
        status: optionalText(input.status) || 'APPROVED',
        riskRating: optionalText(input.riskRating) || 'MEDIUM',
        decision:
          optionalText(input.decision) ||
          optionalText(input.status) ||
          'APPROVED',
        notes: optionalText(input.notes),
      },
    });

    const nextStatus =
      report.status === 'APPROVED' ? 'SHARIAH_IN_REVIEW' : 'REJECTED';
    await this.prisma.mudarabahApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        rejectedAt: nextStatus === 'REJECTED' ? new Date() : undefined,
        rejectionReason:
          nextStatus === 'REJECTED'
            ? report.notes || 'Due diligence rejected'
            : undefined,
      },
    });

    await this.recordFinanceEvent({
      organizationId: application.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'DUE_DILIGENCE_RECORDED',
      entityType: 'DueDiligenceReport',
      entityId: report.id,
      metadata: {
        applicationId: application.id,
        status: report.status,
        riskRating: report.riskRating,
      },
    });

    return this.getApplication(application.id);
  }

  async createShariahReview(
    applicationId: string,
    input: CreateShariahReviewInput,
  ) {
    const application = await this.getApplication(applicationId);
    await this.requireActorRole(
      application.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'SHARIAH_REVIEWER'],
      'Shariah review',
    );

    if (!this.hasApprovedDueDiligence(application)) {
      throw new BadRequestException(
        'Shariah review requires approved due diligence',
      );
    }

    const review = await this.prisma.shariahReview.create({
      data: {
        organizationId: application.organizationId,
        applicationId: application.id,
        reviewerUserId:
          optionalText(input.reviewerUserId) || optionalText(input.actorUserId),
        status: optionalText(input.status) || 'APPROVED',
        decision:
          optionalText(input.decision) ||
          optionalText(input.status) ||
          'APPROVED',
        opinion:
          optionalText(input.opinion) ||
          'Restricted mudarabah structure reviewed for MVP compliance.',
        notes: optionalText(input.notes),
      },
    });

    if (review.status !== 'APPROVED') {
      await this.prisma.mudarabahApplication.update({
        where: { id: application.id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: review.notes || 'Shariah review rejected',
        },
      });
    }

    await this.recordFinanceEvent({
      organizationId: application.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'SHARIAH_REVIEW_RECORDED',
      entityType: 'ShariahReview',
      entityId: review.id,
      metadata: {
        applicationId: application.id,
        status: review.status,
      },
    });

    return this.getApplication(application.id);
  }

  async approveApplication(id: string, input: ActorInput) {
    const application = await this.getApplication(id);
    await this.requireActorRole(
      application.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Application approval',
    );

    if (!this.hasApprovedDueDiligence(application)) {
      throw new BadRequestException(
        'Application cannot be approved without approved due diligence',
      );
    }

    if (!this.hasApprovedShariahReview(application)) {
      throw new BadRequestException(
        'Application cannot be approved without approved Shariah review',
      );
    }

    const approved = await this.prisma.mudarabahApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
      include: applicationInclude,
    });

    await this.recordFinanceEvent({
      organizationId: approved.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MUDARABAH_APPLICATION_APPROVED',
      entityType: 'MudarabahApplication',
      entityId: approved.id,
      metadata: {
        requestedCapital: approved.requestedCapital,
      },
    });

    return approved;
  }

  async rejectApplication(id: string, input: RejectApplicationInput) {
    const application = await this.getApplication(id);
    await this.requireActorRole(
      application.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER'],
      'Application rejection',
    );

    const rejected = await this.prisma.mudarabahApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: optionalText(input.reason) || 'Rejected by reviewer',
      },
      include: applicationInclude,
    });

    await this.recordFinanceEvent({
      organizationId: rejected.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MUDARABAH_APPLICATION_REJECTED',
      entityType: 'MudarabahApplication',
      entityId: rejected.id,
      metadata: {
        reason: rejected.rejectionReason,
      },
    });

    return rejected;
  }

  async createContract(input: CreateContractInput) {
    const application = await this.getApplication(input.applicationId);
    const organizationId = requireText(input.organizationId, 'organizationId');

    if (application.organizationId !== organizationId) {
      throw new BadRequestException(
        'Application does not belong to the organization',
      );
    }

    await this.requireActorRole(
      organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Contract creation',
    );
    this.requireApplicationApproved(application);

    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.mudarabahContract.create({
        data: {
          organizationId,
          applicationId: application.id,
          documentId: optionalText(input.documentId),
          contractNumber:
            optionalText(input.contractNumber) || this.createContractNumber(),
          restrictedUse:
            optionalText(input.restrictedUse) ||
            application.purpose ||
            'Restricted procurement working capital only.',
        },
      });

      await tx.mudarabahApplication.update({
        where: { id: application.id },
        data: {
          status: 'CONTRACT_PENDING_SIGNATURE',
        },
      });

      return created;
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MUDARABAH_CONTRACT_CREATED',
      entityType: 'MudarabahContract',
      entityId: contract.id,
      metadata: {
        applicationId: application.id,
        contractNumber: contract.contractNumber,
      },
    });

    return contract;
  }

  listContracts(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.mudarabahContract.findMany({
      where: { organizationId },
      include: {
        application: {
          include: {
            opportunity: {
              include: {
                project: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async generateContractDocument(
    id: string,
    input: GenerateContractDocumentInput,
  ) {
    const contract = await this.prisma.mudarabahContract.findUnique({
      where: { id },
      include: {
        application: {
          include: applicationInclude,
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    await this.requireActorRole(
      contract.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Contract document generation',
    );
    this.requireApplicationApproved(contract.application);

    const signerEmail =
      optionalText(input.signerEmail) ||
      contract.application.applicantUser?.email ||
      'signer@example.test';
    const generatedAt = new Date().toISOString();
    const documentPayload = {
      documentType: 'MUDARABAH_RESTRICTED_CONTRACT',
      generatedAt,
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        restrictedUse: contract.restrictedUse,
      },
      application: {
        id: contract.applicationId,
        status: contract.application.status,
        requestedCapital: contract.application.requestedCapital,
        currency: contract.application.currency,
        capitalProviderRatio: contract.application.capitalProviderRatio,
        entrepreneurRatio: contract.application.entrepreneurRatio,
        opportunityTitle: contract.application.opportunity?.title ?? null,
      },
      signer: {
        email: signerEmail,
      },
    } satisfies Prisma.InputJsonObject;
    const serializedDocument = JSON.stringify(documentPayload);
    const contentHash = createHash('sha256')
      .update(serializedDocument)
      .digest('hex');

    const generated = await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          organizationId: contract.organizationId,
          title: `${contract.contractNumber} restricted mudarabah contract`,
          documentType: 'MUDARABAH_CONTRACT',
          description:
            'Generated MVP contract record for mock e-signature package.',
          linkedEntityType: 'MudarabahContract',
          linkedEntityId: contract.id,
        },
      });
      const version = await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          fileName: `${contract.contractNumber}.json`,
          mimeType: 'application/json',
          storageUri: `generated://contracts/${contract.id}/document-v1`,
          sizeBytes: Buffer.byteLength(serializedDocument),
          contentHash,
          metadata: documentPayload,
          createdByUserId: optionalText(input.actorUserId),
        },
      });
      const updatedContract = await tx.mudarabahContract.update({
        where: { id: contract.id },
        data: {
          documentId: document.id,
        },
      });

      return {
        contract: updatedContract,
        document,
        version,
      };
    });

    await this.recordFinanceEvent({
      organizationId: contract.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MUDARABAH_CONTRACT_DOCUMENT_GENERATED',
      entityType: 'MudarabahContract',
      entityId: contract.id,
      metadata: {
        applicationId: contract.applicationId,
        documentId: generated.document.id,
        documentVersionId: generated.version.id,
        contentHash,
      },
    });

    const esignPackageRequest = await this.outbox.create({
      organizationId: contract.organizationId,
      eventType: 'ESIGNATURE_PACKAGE_REQUESTED',
      aggregateType: 'MudarabahContract',
      aggregateId: contract.id,
      idempotencyKey: `esign:${contract.organizationId}:MudarabahContract:${contract.id}:${signerEmail}`,
      payload: {
        integrationType: 'ESIGN',
        aggregateType: 'MudarabahContract',
        aggregateId: contract.id,
        signerEmail,
        documentId: generated.document.id,
        payload: {
          contractNumber: contract.contractNumber,
          contentHash,
        },
      },
    });

    return {
      ...generated,
      esignPackageRequest,
      mockSigningStatus: 'PACKAGE_REQUESTED_MOCK',
    };
  }

  async markContractSigned(id: string, input: ActorInput) {
    const contract = await this.prisma.mudarabahContract.findUnique({
      where: { id },
      include: {
        application: {
          include: applicationInclude,
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    await this.requireActorRole(
      contract.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Contract execution',
    );
    this.requireApplicationApproved(contract.application);

    const signed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.mudarabahContract.update({
        where: { id },
        data: {
          status: 'EXECUTED',
          signedAt: new Date(),
        },
      });

      await tx.mudarabahApplication.update({
        where: { id: contract.applicationId },
        data: {
          status: 'CONTRACT_EXECUTED',
        },
      });

      return updated;
    });

    await this.recordFinanceEvent({
      organizationId: signed.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MUDARABAH_CONTRACT_SIGNED',
      entityType: 'MudarabahContract',
      entityId: signed.id,
      metadata: {
        applicationId: signed.applicationId,
        contractNumber: signed.contractNumber,
      },
    });

    return signed;
  }

  async createDisbursement(input: CreateDisbursementInput) {
    const application = await this.getApplication(input.applicationId);
    const organizationId = requireText(input.organizationId, 'organizationId');

    if (application.organizationId !== organizationId) {
      throw new BadRequestException(
        'Application does not belong to the organization',
      );
    }

    await this.requireActorRole(
      organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Disbursement recording',
    );
    const contract = input.contractId
      ? application.contracts.find((item) => item.id === input.contractId)
      : application.contracts.find((item) => item.status === 'EXECUTED');

    if (!contract || contract.status !== 'EXECUTED') {
      throw new BadRequestException(
        'Disbursement requires an executed contract',
      );
    }

    const disbursedAt = input.disbursedAt
      ? this.parseDate(input.disbursedAt, 'disbursedAt')
      : new Date();

    const disbursement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.disbursement.create({
        data: {
          organizationId,
          applicationId: application.id,
          contractId: contract.id,
          amount: positiveNumber(
            input.amount,
            'amount',
            application.requestedCapital,
          ),
          currency: optionalText(input.currency) || application.currency,
          reference: optionalText(input.reference),
          disbursedAt,
        },
      });

      await tx.mudarabahApplication.update({
        where: { id: application.id },
        data: {
          status: 'DISBURSED',
        },
      });

      return created;
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'DISBURSEMENT_RECORDED',
      entityType: 'Disbursement',
      entityId: disbursement.id,
      metadata: {
        applicationId: application.id,
        amount: disbursement.amount,
      },
    });

    return disbursement;
  }

  async createLedgerEntry(input: CreateLedgerEntryInput) {
    const application = await this.getApplication(input.applicationId);
    const organizationId = requireText(input.organizationId, 'organizationId');

    if (application.organizationId !== organizationId) {
      throw new BadRequestException(
        'Application does not belong to the organization',
      );
    }

    await this.requireActorRole(
      organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Ledger entry recording',
    );
    if (
      !['DISBURSED', 'MONITORING', 'PROFIT_LOSS_CALCULATED'].includes(
        application.status,
      )
    ) {
      throw new BadRequestException(
        'Ledger entries require a disbursed application',
      );
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectLedgerEntry.create({
        data: {
          organizationId,
          applicationId: application.id,
          entryType: requireText(input.entryType, 'entryType'),
          description: requireText(input.description, 'description'),
          amount: numericValue(input.amount, 'amount'),
          currency: optionalText(input.currency) || application.currency,
          occurredAt: input.occurredAt
            ? this.parseDate(input.occurredAt, 'occurredAt')
            : new Date(),
        },
      });

      await tx.mudarabahApplication.update({
        where: { id: application.id },
        data: {
          status: 'MONITORING',
        },
      });

      return created;
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'PROJECT_LEDGER_ENTRY_RECORDED',
      entityType: 'ProjectLedgerEntry',
      entityId: entry.id,
      metadata: {
        applicationId: application.id,
        entryType: entry.entryType,
        amount: entry.amount,
      },
    });

    return entry;
  }

  listLedgerEntries(organizationId?: string, applicationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.projectLedgerEntry.findMany({
      where: {
        organizationId,
        applicationId,
      },
      include: {
        application: {
          include: {
            opportunity: {
              include: {
                project: true,
              },
            },
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
  }

  async createProfitLossStatement(input: CreateProfitLossStatementInput) {
    const application = await this.getApplication(input.applicationId);
    const organizationId = requireText(input.organizationId, 'organizationId');

    if (application.organizationId !== organizationId) {
      throw new BadRequestException(
        'Application does not belong to the organization',
      );
    }

    await this.requireActorRole(
      organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Profit/loss calculation',
    );
    if (
      !['MONITORING', 'PROFIT_LOSS_CALCULATED'].includes(application.status)
    ) {
      throw new BadRequestException(
        'Profit/loss requires ledger monitoring entries first',
      );
    }

    const revenue =
      input.revenue === undefined
        ? this.sumLedger(application.ledgerEntries, ['REVENUE', 'INCOME'])
        : numericValue(input.revenue, 'revenue');
    const costs =
      input.costs === undefined
        ? Math.abs(
            this.sumLedger(application.ledgerEntries, ['COST', 'EXPENSE']),
          )
        : numericValue(input.costs, 'costs');
    const netProfit = revenue - costs;
    const providerRatio = application.capitalProviderRatio;
    const entrepreneurRatio = application.entrepreneurRatio;
    const totalRatio = providerRatio + entrepreneurRatio;

    const statement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profitLossStatement.create({
        data: {
          organizationId,
          applicationId: application.id,
          revenue,
          costs,
          netProfit,
          periodStart: input.periodStart
            ? this.parseDate(input.periodStart, 'periodStart')
            : undefined,
          periodEnd: input.periodEnd
            ? this.parseDate(input.periodEnd, 'periodEnd')
            : undefined,
          distributions:
            netProfit >= 0
              ? {
                  create: [
                    {
                      organizationId,
                      party: 'CAPITAL_PROVIDER',
                      ratio: providerRatio,
                      amount: (netProfit * providerRatio) / totalRatio,
                    },
                    {
                      organizationId,
                      party: 'ENTREPRENEUR',
                      ratio: entrepreneurRatio,
                      amount: (netProfit * entrepreneurRatio) / totalRatio,
                    },
                  ],
                }
              : undefined,
          lossExceptions:
            netProfit < 0
              ? {
                  create: {
                    organizationId,
                    applicationId: application.id,
                    exceptionType: 'GENUINE_COMMERCIAL_LOSS',
                    status: 'OPEN',
                    amount: Math.abs(netProfit),
                    notes:
                      'Negative profit/loss requires reviewer classification before closure.',
                  },
                }
              : undefined,
        },
        include: {
          distributions: true,
          lossExceptions: true,
        },
      });

      await tx.mudarabahApplication.update({
        where: { id: application.id },
        data: {
          status: 'PROFIT_LOSS_CALCULATED',
        },
      });

      return created;
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'PROFIT_LOSS_STATEMENT_CREATED',
      entityType: 'ProfitLossStatement',
      entityId: statement.id,
      metadata: {
        applicationId: application.id,
        revenue,
        costs,
        netProfit,
      },
    });

    return statement;
  }

  listProfitLossStatements(organizationId?: string, applicationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.profitLossStatement.findMany({
      where: {
        organizationId,
        applicationId,
      },
      include: {
        distributions: true,
        lossExceptions: true,
        application: {
          include: {
            opportunity: {
              include: {
                project: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createLossException(input: CreateLossExceptionInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const application = await this.getApplication(input.applicationId);

    if (application.organizationId !== organizationId) {
      throw new BadRequestException(
        'Application does not belong to the organization',
      );
    }

    await this.requireActorRole(
      organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCE_ACCOUNTANT', 'FINANCIER_USER'],
      'Loss exception creation',
    );

    const statementId = optionalText(input.statementId);
    if (
      statementId &&
      !application.profitLossStatements.some(
        (statement) => statement.id === statementId,
      )
    ) {
      throw new BadRequestException(
        'Profit/loss statement does not belong to the application',
      );
    }

    const classification = normalizeLossExceptionClassification(
      input.classification,
    );
    const exception = await this.prisma.lossException.create({
      data: {
        organizationId,
        applicationId: application.id,
        statementId,
        exceptionType: classification,
        status: 'OPEN',
        amount: positiveNumber(input.amount, 'amount'),
        notes: optionalText(input.notes),
        evidenceRefs: input.evidenceRefs,
      },
      include: lossExceptionInclude,
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'LOSS_EXCEPTION_CREATED',
      entityType: 'LossException',
      entityId: exception.id,
      metadata: {
        applicationId: application.id,
        statementId,
        classification,
        amount: exception.amount,
        status: exception.status,
      },
    });

    return exception;
  }

  async getLossException(id: string, actorUserId?: string) {
    const exception = await this.prisma.lossException.findUnique({
      where: { id },
      include: lossExceptionInclude,
    });

    if (!exception) {
      throw new NotFoundException('Loss exception not found');
    }

    if (actorUserId !== undefined) {
      await this.requireActorRole(
        exception.organizationId,
        actorUserId,
        [
          'ORG_ADMIN',
          'FINANCE_ACCOUNTANT',
          'FINANCIER_USER',
          'SHARIAH_REVIEWER',
          'AUDITOR',
        ],
        'Loss exception read',
      );
    }

    return exception;
  }

  async listLossExceptions(
    organizationId?: string,
    applicationId?: string,
    actorUserId?: string,
  ) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    await this.requireActorRole(
      organizationId,
      actorUserId,
      [
        'ORG_ADMIN',
        'FINANCE_ACCOUNTANT',
        'FINANCIER_USER',
        'SHARIAH_REVIEWER',
        'AUDITOR',
      ],
      'Loss exception list',
    );

    return this.prisma.lossException.findMany({
      where: {
        organizationId,
        applicationId,
      },
      include: lossExceptionInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async attachLossExceptionEvidence(
    id: string,
    input: AttachLossExceptionEvidenceInput,
  ) {
    const exception = await this.getLossException(id);

    await this.requireActorRole(
      exception.organizationId,
      input.actorUserId,
      [
        'ORG_ADMIN',
        'FINANCE_ACCOUNTANT',
        'FINANCIER_USER',
        'SHARIAH_REVIEWER',
        'AUDITOR',
      ],
      'Loss exception evidence attachment',
    );

    const currentStatus = normalizeLossExceptionStatus(exception.status);
    if (
      !['OPEN', 'EVIDENCE_REQUESTED', 'UNDER_REVIEW', 'REOPENED'].includes(
        currentStatus,
      )
    ) {
      throw new BadRequestException({
        code: 'WORKFLOW_RULE_VIOLATION',
        message:
          'Evidence can only be attached before a loss exception is closed or classified',
        requiredState: 'OPEN, EVIDENCE_REQUESTED, UNDER_REVIEW, or REOPENED',
        actualState: currentStatus,
        nextAllowedActions: getNextLossExceptionStatuses(currentStatus),
      });
    }

    const nextStatus: LossExceptionStatus = 'UNDER_REVIEW';
    assertLossExceptionTransition(currentStatus, nextStatus);

    const updateData: Prisma.LossExceptionUpdateInput = {
      status: nextStatus,
    };
    const notes = optionalText(input.notes);
    if (notes) {
      updateData.notes = notes;
    }
    if (input.evidenceRefs !== undefined) {
      updateData.evidenceRefs = input.evidenceRefs;
    }

    const updated = await this.prisma.lossException.update({
      where: { id },
      data: updateData,
      include: lossExceptionInclude,
    });

    await this.recordFinanceEvent({
      organizationId: updated.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'LOSS_EXCEPTION_EVIDENCE_ATTACHED',
      entityType: 'LossException',
      entityId: updated.id,
      metadata: {
        applicationId: updated.applicationId,
        status: updated.status,
      },
    });

    return updated;
  }

  async classifyLossException(id: string, input: ClassifyLossExceptionInput) {
    const exception = await this.getLossException(id);

    await this.requireActorRole(
      exception.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER'],
      'Loss exception classification',
    );
    assertLossExceptionTransition(exception.status, 'CLASSIFIED');

    const classification = normalizeLossExceptionClassification(
      input.classification,
    );
    const rationale = requireText(input.rationale, 'rationale');
    const reviewerUserId =
      optionalText(input.reviewerUserId) || optionalText(input.actorUserId);
    const updated = await this.prisma.lossException.update({
      where: { id },
      data: {
        exceptionType: classification,
        status: 'CLASSIFIED',
        decision: optionalText(input.decision) || classification,
        rationale,
        reviewerUserId,
        decidedAt: new Date(),
      },
      include: lossExceptionInclude,
    });

    await this.recordFinanceEvent({
      organizationId: updated.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'LOSS_EXCEPTION_CLASSIFIED',
      entityType: 'LossException',
      entityId: updated.id,
      metadata: {
        applicationId: updated.applicationId,
        classification,
        status: updated.status,
      },
    });

    return updated;
  }

  async resolveLossException(id: string, input: ResolveLossExceptionInput) {
    const exception = await this.getLossException(id);

    await this.requireActorRole(
      exception.organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER', 'SHARIAH_REVIEWER'],
      'Loss exception resolution',
    );
    assertLossExceptionTransition(exception.status, 'RESOLVED');

    const updateData: Prisma.LossExceptionUpdateInput = {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    };
    const notes = optionalText(input.notes);
    if (notes) {
      updateData.notes = notes;
    }

    const updated = await this.prisma.lossException.update({
      where: { id },
      data: updateData,
      include: lossExceptionInclude,
    });

    await this.recordFinanceEvent({
      organizationId: updated.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'LOSS_EXCEPTION_RESOLVED',
      entityType: 'LossException',
      entityId: updated.id,
      metadata: {
        applicationId: updated.applicationId,
        classification: updated.exceptionType,
        status: updated.status,
      },
    });

    return updated;
  }

  async createClosure(input: CreateClosureInput) {
    const application = await this.getApplication(input.applicationId);
    const organizationId = requireText(input.organizationId, 'organizationId');

    if (application.organizationId !== organizationId) {
      throw new BadRequestException(
        'Application does not belong to the organization',
      );
    }

    await this.requireActorRole(
      organizationId,
      input.actorUserId,
      ['ORG_ADMIN', 'FINANCIER_USER'],
      'Closure pack export',
    );
    if (application.status !== 'PROFIT_LOSS_CALCULATED') {
      throw new BadRequestException(
        'Closure requires a calculated profit/loss statement',
      );
    }

    const evidencePackId =
      optionalText(input.evidencePackId) ||
      application.opportunity.evidencePackId;
    const auditTimeline = await this.prisma.auditEvent.findMany({
      where: {
        organizationId,
        OR: [
          {
            entityType: 'MudarabahApplication',
            entityId: application.id,
          },
          {
            entityType: 'ProcurementOpportunity',
            entityId: application.opportunityId,
          },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 200,
    });

    const closure = await this.prisma.$transaction(async (tx) => {
      const created = await tx.closurePack.create({
        data: {
          organizationId,
          applicationId: application.id,
          evidencePackId,
          summary: {
            procurementEvidencePackId: evidencePackId,
            auditEventCount: auditTimeline.length,
            latestProfitLossStatementId:
              application.profitLossStatements[0]?.id || null,
            contractId: application.contracts[0]?.id || null,
          },
        },
      });

      await tx.mudarabahApplication.update({
        where: { id: application.id },
        data: {
          status: 'CLOSED',
        },
      });

      return created;
    });

    await this.recordFinanceEvent({
      organizationId,
      actorUserId: input.actorUserId,
      eventType: 'CLOSURE_PACK_EXPORTED',
      entityType: 'ClosurePack',
      entityId: closure.id,
      metadata: {
        applicationId: application.id,
        evidencePackId,
        auditEventCount: auditTimeline.length,
      },
    });

    return closure;
  }

  listClosures(organizationId?: string, applicationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.closurePack.findMany({
      where: {
        organizationId,
        applicationId,
      },
      include: {
        evidencePack: true,
        application: {
          include: {
            opportunity: {
              include: {
                project: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async requireActorRole(
    organizationId: string,
    actorUserId: string | undefined,
    allowedRoles: FinanceActorRole[],
    actionLabel: string,
  ) {
    const userId = optionalText(actorUserId);

    if (!userId) {
      throw new ForbiddenException(`${actionLabel} requires an actor`);
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
        status: 'active',
        role: {
          code: {
            in: allowedRoles,
          },
        },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        `${actionLabel} requires one of these roles: ${allowedRoles.join(', ')}`,
      );
    }
  }

  private async refreshChecklistStatus(checklistId: string) {
    const checklist = await this.prisma.evidenceChecklist.findUnique({
      where: { id: checklistId },
      include: {
        items: true,
      },
    });

    if (!checklist) {
      return;
    }

    const allComplete = checklist.items.every(
      (item) => item.status === 'COMPLETED',
    );

    await this.prisma.evidenceChecklist.update({
      where: { id: checklist.id },
      data: {
        status: allComplete ? 'COMPLETED' : 'PENDING',
      },
    });

    if (allComplete) {
      await this.prisma.mudarabahApplication.update({
        where: { id: checklist.applicationId },
        data: {
          status: 'DUE_DILIGENCE_IN_REVIEW',
        },
      });
    }
  }

  private requireChecklistComplete(
    application: Prisma.MudarabahApplicationGetPayload<{
      include: typeof applicationInclude;
    }>,
  ) {
    const checklist = application.evidenceChecklist;

    if (
      !checklist ||
      !checklist.items.length ||
      checklist.items.some((item) => item.status !== 'COMPLETED')
    ) {
      throw new BadRequestException(
        'Due diligence requires a completed evidence checklist',
      );
    }
  }

  private hasApprovedDueDiligence(
    application: Prisma.MudarabahApplicationGetPayload<{
      include: typeof applicationInclude;
    }>,
  ) {
    return application.dueDiligenceReports.some(
      (report) =>
        report.status === 'APPROVED' || report.decision === 'APPROVED',
    );
  }

  private hasApprovedShariahReview(
    application: Prisma.MudarabahApplicationGetPayload<{
      include: typeof applicationInclude;
    }>,
  ) {
    return application.shariahReviews.some(
      (review) =>
        review.status === 'APPROVED' || review.decision === 'APPROVED',
    );
  }

  private requireApplicationApproved(
    application: Prisma.MudarabahApplicationGetPayload<{
      include: typeof applicationInclude;
    }>,
  ) {
    if (
      application.status !== 'APPROVED' &&
      application.status !== 'CONTRACT_PENDING_SIGNATURE'
    ) {
      throw new BadRequestException(
        'Contract work requires an approved application',
      );
    }

    if (!this.hasApprovedDueDiligence(application)) {
      throw new BadRequestException(
        'Contract cannot be generated without approved due diligence',
      );
    }

    if (!this.hasApprovedShariahReview(application)) {
      throw new BadRequestException(
        'Contract cannot be generated without approved Shariah review',
      );
    }
  }

  private assertOptionalOrgRecord(
    organizationId: string,
    recordOrganizationId: string | undefined,
    label: string,
  ) {
    if (recordOrganizationId && recordOrganizationId !== organizationId) {
      throw new BadRequestException(
        `${label} does not belong to the organization`,
      );
    }
  }

  private requireRevenueGeneratingOpportunity(input: {
    purchaseOrder: { totalAmount: number } | null;
    evidencePack: { id: string } | null;
    estimatedCapital: number;
    expectedProfit?: number;
  }) {
    const hasRevenueSource = Boolean(input.purchaseOrder || input.evidencePack);

    if (!hasRevenueSource) {
      throw this.workflowRuleViolation({
        message:
          'Mudarabah opportunities require a revenue-generating source document such as a buyer purchase order, contract award, sales order, tender result, or equivalent evidence pack.',
        requiredState: 'REVENUE_SOURCE_PRESENT',
        actualState: 'NO_REVENUE_SOURCE',
        nextAllowedActions: [
          'Link a buyer purchase order',
          'Link an evidence pack containing equivalent revenue evidence',
        ],
      });
    }

    if (input.estimatedCapital <= 0) {
      throw this.workflowRuleViolation({
        message:
          'Mudarabah opportunities require a positive requested capital amount.',
        requiredState: 'REQUESTED_CAPITAL_POSITIVE',
        actualState: 'REQUESTED_CAPITAL_NOT_POSITIVE',
        nextAllowedActions: ['Enter a positive requested capital amount'],
      });
    }

    if (input.expectedProfit === undefined || input.expectedProfit <= 0) {
      throw this.workflowRuleViolation({
        message:
          'Mudarabah opportunities must be revenue-generating; expected profit must be positive before an application can be created.',
        requiredState: 'EXPECTED_PROFIT_POSITIVE',
        actualState: 'EXPECTED_PROFIT_NOT_POSITIVE',
        nextAllowedActions: [
          'Enter expected revenue and cost evidence that produces positive expected profit',
        ],
      });
    }
  }

  private requireExistingOpportunityEligible(
    opportunity: Prisma.ProcurementOpportunityGetPayload<{
      include: typeof opportunityInclude;
    }>,
  ) {
    this.requireRevenueGeneratingOpportunity({
      purchaseOrder: opportunity.purchaseOrder,
      evidencePack: opportunity.evidencePack,
      estimatedCapital: opportunity.estimatedCapital,
      expectedProfit: opportunity.expectedProfit ?? undefined,
    });
  }

  private workflowRuleViolation(input: {
    message: string;
    requiredState: string;
    actualState: string;
    nextAllowedActions: string[];
  }) {
    return new BadRequestException({
      code: 'WORKFLOW_RULE_VIOLATION',
      message: input.message,
      requiredState: input.requiredState,
      actualState: input.actualState,
      nextAllowedActions: input.nextAllowedActions,
    });
  }

  private sumLedger(
    entries: Array<{ entryType: string; amount: number }>,
    entryTypes: string[],
  ) {
    const types = new Set(entryTypes);

    return entries.reduce(
      (total, entry) =>
        types.has(entry.entryType.toUpperCase()) ? total + entry.amount : total,
      0,
    );
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    return date;
  }

  private createContractNumber() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');

    return `MUD-${date}-${suffix}`;
  }

  private async recordFinanceEvent(input: {
    organizationId: string;
    actorUserId?: string;
    eventType: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonObject;
  }) {
    await this.auditEvents.create(input);
    await this.outbox.create({
      organizationId: input.organizationId,
      eventType: input.eventType,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      payload: {
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata || {},
      },
    });
  }
}
