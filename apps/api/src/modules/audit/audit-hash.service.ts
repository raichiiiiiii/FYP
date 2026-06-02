import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

export type CanonicalHashResult = {
  canonicalJson: Prisma.InputJsonValue;
  canonicalText: string;
  canonicalHash: string;
  hashAlgorithm: 'SHA-256';
};

@Injectable()
export class AuditHashService {
  constructor(private readonly prisma: PrismaService) {}

  hashCanonicalJson(input: unknown): CanonicalHashResult {
    const canonicalJson = this.normalize(input) as Prisma.InputJsonValue;
    const canonicalText = JSON.stringify(canonicalJson);
    const canonicalHash = createHash('sha256')
      .update(canonicalText, 'utf8')
      .digest('hex');

    return {
      canonicalJson,
      canonicalText,
      canonicalHash,
      hashAlgorithm: 'SHA-256',
    };
  }

  async hashEntity(entityType: string, entityId: string) {
    return this.hashCanonicalJson(
      await this.getCanonicalEntityPayload(entityType, entityId),
    );
  }

  async getCanonicalEntityPayload(entityType: string, entityId: string) {
    switch (entityType) {
      case 'Project':
        return this.projectPayload(entityId);
      case 'Supplier':
        return this.supplierPayload(entityId);
      case 'Requisition':
        return this.requisitionPayload(entityId);
      case 'RFQ':
        return this.rfqPayload(entityId);
      case 'Quotation':
        return this.quotationPayload(entityId);
      case 'PurchaseOrder':
        return this.purchaseOrderPayload(entityId);
      case 'Receipt':
        return this.receiptPayload(entityId);
      case 'Invoice':
        return this.invoicePayload(entityId);
      case 'Document':
        return this.documentPayload(entityId);
      case 'DocumentVersion':
        return this.documentVersionPayload(entityId);
      case 'EvidenceItem':
        return this.evidenceItemPayload(entityId);
      case 'EvidencePack':
        return this.evidencePackPayload(entityId);
      default:
        throw new BadRequestException(`Unsupported entityType: ${entityType}`);
    }
  }

  private normalize(value: unknown): CanonicalValue {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalize(item));
    }

    if (value === null || typeof value !== 'object') {
      if (value === undefined) {
        return null;
      }

      return value as string | number | boolean | null;
    }

    const record = value as Record<string, unknown>;

    return Object.keys(record)
      .sort()
      .reduce<{ [key: string]: CanonicalValue }>((accumulator, key) => {
        const item = record[key];

        if (item !== undefined) {
          accumulator[key] = this.normalize(item);
        }

        return accumulator;
      }, {});
  }

  private money(value: number | null | undefined) {
    return Number(value ?? 0).toFixed(2);
  }

  private async projectPayload(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      entityType: 'Project',
      entityId: project.id,
      organizationId: project.organizationId,
      name: project.name,
      code: project.code,
      status: project.status,
      budget: project.budget === null ? null : this.money(project.budget),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private async supplierPayload(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return {
      entityType: 'Supplier',
      entityId: supplier.id,
      organizationId: supplier.organizationId,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      status: supplier.status,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  private async requisitionPayload(id: string) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        approvalRequests: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    return {
      entityType: 'Requisition',
      entityId: requisition.id,
      organizationId: requisition.organizationId,
      projectId: requisition.projectId,
      requesterUserId: requisition.requesterUserId,
      title: requisition.title,
      status: requisition.status,
      totalAmount: this.money(requisition.totalAmount),
      submittedAt: requisition.submittedAt,
      approvedAt: requisition.approvedAt,
      rejectedAt: requisition.rejectedAt,
      items: requisition.items.map((item) => ({
        id: item.id,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unitPrice: this.money(item.unitPrice),
      })),
      approvals: requisition.approvalRequests.map((approval) => ({
        id: approval.id,
        approverUserId: approval.approverUserId,
        status: approval.status,
        decision: approval.decision,
        decidedAt: approval.decidedAt,
      })),
    };
  }

  private async rfqPayload(id: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    return {
      entityType: 'RFQ',
      entityId: rfq.id,
      organizationId: rfq.organizationId,
      requisitionId: rfq.requisitionId,
      title: rfq.title,
      status: rfq.status,
      publishedAt: rfq.publishedAt,
      items: rfq.items
        .slice()
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((item) => ({
          id: item.id,
          requisitionItemId: item.requisitionItemId,
          description: item.description,
          quantity: item.quantity,
          targetPrice:
            item.targetPrice === null ? null : this.money(item.targetPrice),
        })),
    };
  }

  private async quotationPayload(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return {
      entityType: 'Quotation',
      entityId: quotation.id,
      organizationId: quotation.organizationId,
      rfqId: quotation.rfqId,
      supplierId: quotation.supplierId,
      status: quotation.status,
      totalAmount: this.money(quotation.totalAmount),
      receivedAt: quotation.receivedAt,
      items: quotation.items.map((item) => ({
        id: item.id,
        rfqItemId: item.rfqItemId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: this.money(item.unitPrice),
      })),
    };
  }

  private async purchaseOrderPayload(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return {
      entityType: 'PurchaseOrder',
      entityId: purchaseOrder.id,
      organizationId: purchaseOrder.organizationId,
      documentNumber: purchaseOrder.poNumber,
      requisitionId: purchaseOrder.requisitionId,
      quotationId: purchaseOrder.quotationId,
      supplierId: purchaseOrder.supplierId,
      status: purchaseOrder.status,
      totalAmount: this.money(purchaseOrder.totalAmount),
      currency: 'MYR',
      issuedAt: purchaseOrder.issuedAt,
      items: purchaseOrder.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: this.money(item.unitPrice),
      })),
    };
  }

  private async receiptPayload(id: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id } });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return {
      entityType: 'Receipt',
      entityId: receipt.id,
      organizationId: receipt.organizationId,
      purchaseOrderId: receipt.purchaseOrderId,
      status: receipt.status,
      receivedAt: receipt.receivedAt,
      notes: receipt.notes,
    };
  }

  private async invoicePayload(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      entityType: 'Invoice',
      entityId: invoice.id,
      organizationId: invoice.organizationId,
      purchaseOrderId: invoice.purchaseOrderId,
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      amount: this.money(invoice.amount),
      status: invoice.status,
      issuedAt: invoice.issuedAt,
    };
  }

  private async documentPayload(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      entityType: 'Document',
      entityId: document.id,
      organizationId: document.organizationId,
      title: document.title,
      documentType: document.documentType,
      linkedEntityType: document.linkedEntityType,
      linkedEntityId: document.linkedEntityId,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private async documentVersionPayload(id: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!version) {
      throw new NotFoundException('Document version not found');
    }

    return {
      entityType: 'DocumentVersion',
      entityId: version.id,
      organizationId: version.document.organizationId,
      documentId: version.documentId,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      mimeType: version.mimeType,
      storageUri: version.storageUri,
      sizeBytes: version.sizeBytes,
      hashAlgorithm: version.hashAlgorithm,
      contentHash: version.contentHash,
      metadata: version.metadata,
      createdByUserId: version.createdByUserId,
      createdAt: version.createdAt,
    };
  }

  private async evidenceItemPayload(id: string) {
    const item = await this.prisma.evidenceItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Evidence item not found');
    }

    return {
      entityType: 'EvidenceItem',
      entityId: item.id,
      organizationId: item.organizationId,
      evidencePackId: item.evidencePackId,
      documentId: item.documentId,
      documentVersionId: item.documentVersionId,
      linkedEntityType: item.entityType,
      linkedEntityId: item.entityId,
      label: item.label,
      evidenceType: item.evidenceType,
      metadata: item.metadata,
      createdAt: item.createdAt,
    };
  }

  private async evidencePackPayload(id: string) {
    const pack = await this.prisma.evidencePack.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!pack) {
      throw new NotFoundException('Evidence pack not found');
    }

    return {
      entityType: 'EvidencePack',
      entityId: pack.id,
      organizationId: pack.organizationId,
      projectId: pack.projectId,
      title: pack.title,
      status: pack.status,
      summary: pack.summary,
      exportedAt: pack.exportedAt,
      itemIds: pack.items.map((item) => item.id),
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
    };
  }
}
