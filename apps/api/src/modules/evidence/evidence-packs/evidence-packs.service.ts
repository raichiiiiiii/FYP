import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditHashService } from '../../audit/audit-hash.service';
import { OutboxService } from '../../outbox/outbox.service';
import { optionalText, requireText } from '../evidence.service-utils';

type PackEvidenceSeed = {
  entityType: string;
  entityId: string;
  label: string;
  evidenceType: string;
  documentId?: string;
  documentVersionId?: string;
  metadata?: Prisma.InputJsonObject;
};

type PackGeneration = {
  summary: Prisma.InputJsonObject;
  items: PackEvidenceSeed[];
  fallbackTitle: string;
};

export type CreateEvidencePackInput = {
  organizationId: string;
  actorUserId?: string;
  projectId?: string;
  title?: string;
};

export type ExportEvidencePackInput = {
  actorUserId?: string;
};

export type EvidencePackExportFormat = 'json' | 'pdf';

export type EvidencePackExportArtifact = {
  fileName: string;
  contentType: string;
  content: Buffer;
};

const evidencePackInclude = {
  project: true,
  items: {
    include: {
      document: true,
      documentVersion: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.EvidencePackInclude;

@Injectable()
export class EvidencePacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
    private readonly auditHash: AuditHashService,
    private readonly outbox: OutboxService,
  ) {}

  async create(input: CreateEvidencePackInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const projectId = optionalText(input.projectId);
    const emptyGenerated: PackGeneration = {
      summary: {
        project: null,
        counts: {
          evidenceItems: 0,
        },
      },
      items: [],
      fallbackTitle: 'Evidence pack',
    };
    const generated: PackGeneration = projectId
      ? await this.buildProjectEvidence(organizationId, projectId)
      : emptyGenerated;

    const createdPack = await this.prisma.evidencePack.create({
      data: {
        organizationId,
        projectId,
        title:
          optionalText(input.title) ||
          generated.fallbackTitle ||
          'Evidence pack',
        summary: generated.summary,
      },
    });

    if (generated.items.length) {
      await this.prisma.evidenceItem.createMany({
        data: generated.items.map((item) => ({
          organizationId,
          evidencePackId: createdPack.id,
          documentId: item.documentId,
          documentVersionId: item.documentVersionId,
          entityType: item.entityType,
          entityId: item.entityId,
          label: item.label,
          evidenceType: item.evidenceType,
          metadata: item.metadata,
        })),
      });
    }

    const pack = await this.getById(createdPack.id);

    await this.auditEvents.create({
      organizationId: pack.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'EVIDENCE_PACK_CREATED',
      entityType: 'EvidencePack',
      entityId: pack.id,
      metadata: {
        title: pack.title,
        projectId: pack.projectId,
        itemCount: pack.items.length,
      },
    });

    await this.outbox.create({
      organizationId: pack.organizationId,
      eventType: 'EVIDENCE_PACK_CREATED',
      aggregateType: 'EvidencePack',
      aggregateId: pack.id,
      payload: {
        evidencePackId: pack.id,
        projectId: pack.projectId,
        itemCount: pack.items.length,
      },
    });

    return pack;
  }

  async getById(id: string) {
    const pack = await this.prisma.evidencePack.findUnique({
      where: { id },
      include: evidencePackInclude,
    });

    if (!pack) {
      throw new NotFoundException('Evidence pack not found');
    }

    return pack;
  }

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.evidencePack.findMany({
      where: {
        organizationId,
      },
      include: evidencePackInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async export(id: string, input: ExportEvidencePackInput = {}) {
    const pack = await this.getById(id);

    const auditTimeline = await this.auditTimelineForPack(
      pack.organizationId,
      pack.items.map((item) => ({
        entityType: item.entityType,
        entityId: item.entityId,
      })),
    );

    const documentHashes = pack.items
      .filter((item) => item.documentVersion?.contentHash)
      .map((item) => ({
        evidenceItemId: item.id,
        documentId: item.documentId,
        documentVersionId: item.documentVersionId,
        contentHash: item.documentVersion?.contentHash,
        hashAlgorithm: item.documentVersion?.hashAlgorithm,
      }));

    const exported = await this.prisma.evidencePack.update({
      where: { id },
      data: {
        status: 'EXPORTED',
        exportedAt: new Date(),
      },
      include: evidencePackInclude,
    });

    const packHash = await this.auditHash.hashEntity(
      'EvidencePack',
      exported.id,
    );
    const hashRecord = await this.prisma.hashRecord.create({
      data: {
        organizationId: exported.organizationId,
        entityType: 'EvidencePack',
        entityId: exported.id,
        hashAlgorithm: packHash.hashAlgorithm,
        canonicalHash: packHash.canonicalHash,
        canonicalJson: packHash.canonicalJson,
        canonicalText: packHash.canonicalText,
      },
    });

    const exportPayload = {
      evidencePack: exported,
      auditTimeline,
      documentHashes,
      hashRecord,
    };

    await this.auditEvents.create({
      organizationId: exported.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'EVIDENCE_PACK_EXPORTED',
      entityType: 'EvidencePack',
      entityId: exported.id,
      metadata: {
        title: exported.title,
        itemCount: exported.items.length,
        hashRecordId: hashRecord.id,
        canonicalHash: hashRecord.canonicalHash,
      },
    });

    await this.outbox.create({
      organizationId: exported.organizationId,
      eventType: 'EVIDENCE_PACK_EXPORT_REQUESTED',
      aggregateType: 'EvidencePack',
      aggregateId: exported.id,
      idempotencyKey: `evidence-export:${exported.organizationId}:${exported.id}:${hashRecord.id}`,
      payload: {
        integrationType: 'EVIDENCE_EXPORT',
        evidencePackId: exported.id,
        hashRecordId: hashRecord.id,
        canonicalHash: hashRecord.canonicalHash,
      },
    });

    return exportPayload;
  }

  async exportArtifact(
    id: string,
    format: EvidencePackExportFormat,
    input: ExportEvidencePackInput = {},
  ): Promise<EvidencePackExportArtifact> {
    const payload = await this.export(id, input);
    const safeTitle = payload.evidencePack.title.replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );

    if (format === 'pdf') {
      return {
        fileName: `${safeTitle || 'evidence-pack'}.pdf`,
        contentType: 'application/pdf',
        content: buildSimplePdf(reviewerSummaryLines(payload)),
      };
    }

    return {
      fileName: `${safeTitle || 'evidence-pack'}.json`,
      contentType: 'application/json',
      content: Buffer.from(JSON.stringify(payload, null, 2), 'utf8'),
    };
  }

  private async buildProjectEvidence(
    organizationId: string,
    projectId: string,
  ): Promise<PackGeneration> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        requisitions: {
          include: {
            approvalRequests: true,
            rfqs: {
              include: {
                quotations: {
                  include: {
                    supplier: true,
                    items: true,
                  },
                },
                items: true,
              },
            },
            purchaseOrders: {
              include: {
                supplier: true,
                items: true,
                receipts: true,
                invoices: true,
              },
            },
            items: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== organizationId) {
      throw new BadRequestException(
        'Project does not belong to the organization',
      );
    }

    const items: PackEvidenceSeed[] = [
      {
        entityType: 'Project',
        entityId: project.id,
        label: `Project summary: ${project.name}`,
        evidenceType: 'PROJECT_SUMMARY',
      },
    ];
    const supplierIds = new Set<string>();
    let approvalCount = 0;
    let rfqCount = 0;
    let quotationCount = 0;
    let purchaseOrderCount = 0;
    let receiptCount = 0;
    let invoiceCount = 0;

    for (const requisition of project.requisitions) {
      items.push({
        entityType: 'Requisition',
        entityId: requisition.id,
        label: `Requisition: ${requisition.title}`,
        evidenceType: 'REQUISITION',
        metadata: {
          status: requisition.status,
          totalAmount: requisition.totalAmount,
        },
      });

      for (const approval of requisition.approvalRequests) {
        approvalCount += 1;
        items.push({
          entityType: 'ApprovalRequest',
          entityId: approval.id,
          label: `Approval: ${approval.status}`,
          evidenceType: 'APPROVAL',
          metadata: {
            requisitionId: requisition.id,
            decision: approval.decision,
          },
        });
      }

      for (const rfq of requisition.rfqs) {
        rfqCount += 1;
        items.push({
          entityType: 'RFQ',
          entityId: rfq.id,
          label: `RFQ: ${rfq.title}`,
          evidenceType: 'RFQ',
          metadata: {
            requisitionId: requisition.id,
            status: rfq.status,
          },
        });

        for (const quotation of rfq.quotations) {
          quotationCount += 1;
          supplierIds.add(quotation.supplierId);
          items.push({
            entityType: 'Quotation',
            entityId: quotation.id,
            label: `Quotation: ${quotation.supplier.name}`,
            evidenceType: 'QUOTATION',
            metadata: {
              rfqId: rfq.id,
              supplierId: quotation.supplierId,
              totalAmount: quotation.totalAmount,
            },
          });
        }
      }

      for (const purchaseOrder of requisition.purchaseOrders) {
        purchaseOrderCount += 1;
        supplierIds.add(purchaseOrder.supplierId);
        items.push({
          entityType: 'PurchaseOrder',
          entityId: purchaseOrder.id,
          label: `Purchase order: ${purchaseOrder.poNumber}`,
          evidenceType: 'PURCHASE_ORDER',
          metadata: {
            requisitionId: requisition.id,
            supplierId: purchaseOrder.supplierId,
            totalAmount: purchaseOrder.totalAmount,
          },
        });

        for (const receipt of purchaseOrder.receipts) {
          receiptCount += 1;
          items.push({
            entityType: 'Receipt',
            entityId: receipt.id,
            label: `Receipt: ${purchaseOrder.poNumber}`,
            evidenceType: 'RECEIPT',
            metadata: {
              purchaseOrderId: purchaseOrder.id,
              receivedAt: receipt.receivedAt.toISOString(),
            },
          });
        }

        for (const invoice of purchaseOrder.invoices) {
          invoiceCount += 1;
          items.push({
            entityType: 'Invoice',
            entityId: invoice.id,
            label: `Invoice: ${invoice.invoiceNumber}`,
            evidenceType: 'INVOICE',
            metadata: {
              purchaseOrderId: purchaseOrder.id,
              supplierId: invoice.supplierId,
              amount: invoice.amount,
            },
          });
        }
      }
    }

    const suppliers = await this.prisma.supplier.findMany({
      where: {
        id: {
          in: [...supplierIds],
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    for (const supplier of suppliers) {
      items.push({
        entityType: 'Supplier',
        entityId: supplier.id,
        label: `Supplier profile: ${supplier.name}`,
        evidenceType: 'SUPPLIER_PROFILE',
      });
    }

    const linkedDocuments = await this.prisma.document.findMany({
      where: {
        organizationId,
        OR: items.map((item) => ({
          linkedEntityType: item.entityType,
          linkedEntityId: item.entityId,
        })),
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const document of linkedDocuments) {
      items.push({
        entityType: document.linkedEntityType || 'Document',
        entityId: document.linkedEntityId || document.id,
        label: `Document: ${document.title}`,
        evidenceType: document.documentType,
        documentId: document.id,
        documentVersionId: document.versions[0]?.id,
        metadata: {
          documentType: document.documentType,
          latestVersionNumber: document.versions[0]?.versionNumber,
        },
      });
    }

    return {
      fallbackTitle: `${project.name} evidence pack`,
      summary: {
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          status: project.status,
        },
        counts: {
          suppliers: suppliers.length,
          requisitions: project.requisitions.length,
          approvals: approvalCount,
          rfqs: rfqCount,
          quotations: quotationCount,
          purchaseOrders: purchaseOrderCount,
          receipts: receiptCount,
          invoices: invoiceCount,
          documents: linkedDocuments.length,
          evidenceItems: items.length,
        },
      },
      items,
    };
  }

  private auditTimelineForPack(
    organizationId: string,
    entities: Array<{ entityType: string; entityId: string }>,
  ) {
    if (!entities.length) {
      return [];
    }

    return this.prisma.auditEvent.findMany({
      where: {
        organizationId,
        OR: entities.map((entity) => ({
          entityType: entity.entityType,
          entityId: entity.entityId,
        })),
      },
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 500,
    });
  }
}

function reviewerSummaryLines(payload: {
  evidencePack: Awaited<ReturnType<EvidencePacksService['getById']>>;
  auditTimeline: Array<{ eventType: string; createdAt: Date }>;
  documentHashes: Array<{
    documentId: string | null;
    documentVersionId: string | null;
    contentHash: string | null | undefined;
  }>;
  hashRecord: { canonicalHash: string; hashAlgorithm: string };
}) {
  const pack = payload.evidencePack;

  return [
    `Evidence Pack: ${pack.title}`,
    `Status: ${pack.status}`,
    `Project: ${pack.project?.name ?? 'Not linked'}`,
    `Evidence items: ${pack.items.length}`,
    `Audit events included: ${payload.auditTimeline.length}`,
    `Document hashes included: ${payload.documentHashes.length}`,
    `Pack hash (${payload.hashRecord.hashAlgorithm}): ${payload.hashRecord.canonicalHash}`,
    '',
    'Evidence Items',
    ...pack.items
      .slice(0, 60)
      .map(
        (item) =>
          `${item.evidenceType}: ${item.label} (${item.entityType}/${item.entityId})`,
      ),
    '',
    'Audit Timeline',
    ...payload.auditTimeline
      .slice(0, 80)
      .map((event) => `${event.createdAt.toISOString()} ${event.eventType}`),
  ];
}

function buildSimplePdf(lines: string[]) {
  const escapedLines = lines.flatMap((line) => wrapPdfLine(line, 92));
  const text = escapedLines
    .map((line, index) => {
      const y = 760 - index * 14;

      if (y < 36) {
        return null;
      }

      return `BT /F1 10 Tf 36 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .filter(Boolean)
    .join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(text, 'utf8')} >> stream\n${text}\nendstream endobj`,
  ];
  let offset = '%PDF-1.4\n'.length;
  const xref = ['0000000000 65535 f '];
  const body = objects
    .map((object) => {
      xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
      offset += object.length + 1;
      return object;
    })
    .join('\n');
  const xrefOffset = offset;
  const pdf = `%PDF-1.4\n${body}\nxref\n0 ${xref.length}\n${xref.join(
    '\n',
  )}\ntrailer << /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

function wrapPdfLine(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return [value];
  }

  const lines: string[] = [];

  for (let index = 0; index < value.length; index += maxLength) {
    lines.push(value.slice(index, index + maxLength));
  }

  return lines;
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
