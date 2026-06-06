import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { PrismaService } from '../../database/prisma.service';
import { ObjectStorageService } from '../evidence/object-storage/object-storage.service';
import {
  assertReportExportTransition,
  normalizeReportExportFormat,
  normalizeReportExportStatus,
  normalizeReportType,
  type ReportType,
} from './report-export-lifecycle';

type ReportInput = {
  organizationId?: string;
  actorUserId?: string;
};

type CreateReportExportJobInput = ReportInput & {
  reportType?: string;
  format?: string;
  metadata?: Prisma.InputJsonValue;
};

type GetReportExportJobInput = ReportInput & {
  exportJobId?: string;
};

type TransitionReportExportJobInput = {
  organizationId?: string;
  exportJobId?: string;
  status?: string;
  filePath?: string;
  objectKey?: string;
  errorMessage?: string;
  completedAt?: Date;
  expiresAt?: Date;
};

type ReportSection = {
  id: string;
  label: string;
  total: number;
  status: 'ready' | 'empty' | 'restricted';
};

type ActorReportContext = {
  organizationId: string;
  actorUserId: string;
  roleCodes: string[];
};

const financeReportRoles = new Set([
  'ORG_ADMIN',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
]);

const procurementReportRoles = new Set([
  'ORG_ADMIN',
  'PROCUREMENT_OFFICER',
  'APPROVER',
  'AUDITOR',
]);

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async getSummary(input: ReportInput) {
    const actor = await this.requireActor(input);
    const [procurement, finance, audit, integrations] = await Promise.all([
      this.procurementCounts(actor.organizationId),
      this.canViewFinance(actor)
        ? this.financeCounts(actor.organizationId)
        : Promise.resolve(restrictedFinanceCounts()),
      this.auditCounts(actor.organizationId),
      this.integrationCounts(actor.organizationId),
    ]);

    const sections: ReportSection[] = [
      section('procurement', 'Procurement', procurement.total),
      this.canViewFinance(actor)
        ? section('finance', 'Finance', finance.total)
        : {
            id: 'finance',
            label: 'Finance',
            total: 0,
            status: 'restricted',
          },
      section('audit', 'Audit', audit.total),
      section('integrations', 'Integrations', integrations.total),
    ];

    return {
      organizationId: actor.organizationId,
      generatedAt: new Date().toISOString(),
      sections,
      totals: {
        procurement: procurement.total,
        finance: finance.total,
        audit: audit.total,
        integrations: integrations.total,
      },
    };
  }

  async getProcurementReport(input: ReportInput) {
    const actor = await this.requireActor(input);

    if (!this.canViewProcurement(actor)) {
      throw new ForbiddenException('Procurement report access denied');
    }

    return {
      organizationId: actor.organizationId,
      generatedAt: new Date().toISOString(),
      counts: await this.procurementCounts(actor.organizationId),
      requisitionsByStatus: await this.statusCounts('requisition', actor),
      purchaseOrdersByStatus: await this.statusCounts('purchaseOrder', actor),
      invoicesByStatus: await this.statusCounts('invoice', actor),
    };
  }

  async getFinanceReport(input: ReportInput) {
    const actor = await this.requireActor(input);

    if (!this.canViewFinance(actor)) {
      throw new ForbiddenException('Finance report access denied');
    }

    return {
      organizationId: actor.organizationId,
      generatedAt: new Date().toISOString(),
      counts: await this.financeCounts(actor.organizationId),
      opportunitiesByStatus: await this.statusCounts(
        'procurementOpportunity',
        actor,
      ),
      applicationsByStatus: await this.statusCounts(
        'mudarabahApplication',
        actor,
      ),
      contractsByStatus: await this.statusCounts('mudarabahContract', actor),
      disbursementsByStatus: await this.statusCounts('disbursement', actor),
    };
  }

  async getAuditReport(input: ReportInput) {
    const actor = await this.requireActor(input);

    return {
      organizationId: actor.organizationId,
      generatedAt: new Date().toISOString(),
      counts: await this.auditCounts(actor.organizationId),
      anchorsByStatus: await this.statusCounts('auditAnchor', actor),
      hashRecordsByEntityType: await this.hashRecordsByEntityType(
        actor.organizationId,
      ),
    };
  }

  async getIntegrationReport(input: ReportInput) {
    const actor = await this.requireActor(input);

    return {
      organizationId: actor.organizationId,
      generatedAt: new Date().toISOString(),
      counts: await this.integrationCounts(actor.organizationId),
      outboxByStatus: await this.statusCounts('outboxEvent', actor),
      reconciliationByStatus: await this.statusCounts(
        'integrationReconciliationRecord',
        actor,
      ),
    };
  }

  async createExportJob(input: CreateReportExportJobInput) {
    const actor = await this.requireActor(input);
    const reportType = normalizeReportType(input.reportType);
    const format = normalizeReportExportFormat(input.format);

    this.assertReportAccess(actor, reportType);

    return this.prisma.reportExportJob.create({
      data: {
        organizationId: actor.organizationId,
        requestedByUserId: actor.actorUserId,
        reportType,
        format,
        status: 'queued',
        metadata: input.metadata,
      },
    });
  }

  async requestExport(input: CreateReportExportJobInput) {
    const reportType = normalizeReportType(input.reportType);
    const format = normalizeReportExportFormat(input.format);
    const exportJob = await this.createExportJob({
      ...input,
      reportType,
      format,
    });

    await this.auditReportExport({
      organizationId: exportJob.organizationId,
      actorUserId: exportJob.requestedByUserId ?? undefined,
      eventType: 'REPORT_EXPORT_REQUESTED',
      exportJobId: exportJob.id,
      metadata: {
        reportType,
        format,
      },
    });

    await this.transitionExportJob({
      organizationId: exportJob.organizationId,
      exportJobId: exportJob.id,
      status: 'processing',
    });

    try {
      const report = await this.buildReportPayload({
        organizationId: exportJob.organizationId,
        actorUserId: exportJob.requestedByUserId ?? undefined,
        reportType,
      });
      const content = JSON.stringify(
        {
          exportJob: {
            id: exportJob.id,
            organizationId: exportJob.organizationId,
            reportType,
            format,
            requestedByUserId: exportJob.requestedByUserId,
            generatedAt: new Date().toISOString(),
          },
          report,
        },
        null,
        2,
      );
      const objectName = reportExportObjectName(exportJob.id, reportType);
      const stored = await this.objectStorage.putObject({
        objectName,
        content,
        contentType: 'application/json',
      });
      const completed = await this.transitionExportJob({
        organizationId: exportJob.organizationId,
        exportJobId: exportJob.id,
        status: 'completed',
        filePath: stored.storageUri,
        objectKey: stored.objectName,
      });

      await this.auditReportExport({
        organizationId: exportJob.organizationId,
        actorUserId: exportJob.requestedByUserId ?? undefined,
        eventType: 'REPORT_EXPORT_COMPLETED',
        exportJobId: exportJob.id,
        metadata: {
          reportType,
          format,
          objectKey: stored.objectName,
          sizeBytes: stored.sizeBytes,
        },
      });

      return completed;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Report export failed';

      await this.transitionExportJob({
        organizationId: exportJob.organizationId,
        exportJobId: exportJob.id,
        status: 'failed',
        errorMessage: message,
      }).catch(() => undefined);
      await this.auditReportExport({
        organizationId: exportJob.organizationId,
        actorUserId: exportJob.requestedByUserId ?? undefined,
        eventType: 'REPORT_EXPORT_FAILED',
        exportJobId: exportJob.id,
        metadata: {
          reportType,
          format,
          errorMessage: message,
        },
      }).catch(() => undefined);

      throw new BadRequestException(`Report export failed: ${message}`);
    }
  }

  async getExportJob(input: GetReportExportJobInput) {
    const actor = await this.requireActor(input);
    const exportJobId = required(input.exportJobId, 'exportJobId');
    const exportJob = await this.prisma.reportExportJob.findFirst({
      where: {
        id: exportJobId,
        organizationId: actor.organizationId,
      },
    });

    if (!exportJob) {
      throw new NotFoundException('Report export job not found');
    }

    this.assertReportAccess(actor, normalizeReportType(exportJob.reportType));

    return exportJob;
  }

  async transitionExportJob(input: TransitionReportExportJobInput) {
    const organizationId = required(input.organizationId, 'organizationId');
    const exportJobId = required(input.exportJobId, 'exportJobId');
    const status = normalizeReportExportStatus(input.status);
    const exportJob = await this.prisma.reportExportJob.findFirst({
      where: {
        id: exportJobId,
        organizationId,
      },
    });

    if (!exportJob) {
      throw new NotFoundException('Report export job not found');
    }

    assertReportExportTransition(exportJob.status, status);

    return this.prisma.reportExportJob.update({
      where: {
        id: exportJob.id,
      },
      data: {
        status,
        filePath: input.filePath,
        objectKey: input.objectKey,
        errorMessage: input.errorMessage,
        completedAt:
          status === 'completed'
            ? input.completedAt || new Date()
            : input.completedAt,
        expiresAt: input.expiresAt,
      },
    });
  }

  async downloadExport(input: GetReportExportJobInput) {
    const exportJob = await this.getExportJob(input);

    if (exportJob.status !== 'completed' || !exportJob.objectKey) {
      throw new BadRequestException('Report export is not ready to download');
    }

    const content = await this.objectStorage.getObjectBuffer(
      reportExportBucket(),
      exportJob.objectKey,
    );

    await this.auditReportExport({
      organizationId: exportJob.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'REPORT_EXPORT_DOWNLOADED',
      exportJobId: exportJob.id,
      metadata: {
        reportType: exportJob.reportType,
        format: exportJob.format,
        objectKey: exportJob.objectKey,
      },
    });

    return {
      exportJob,
      content,
      contentType: 'application/json',
      fileName: `${exportJob.reportType}-report-${exportJob.id}.json`,
    };
  }

  private async requireActor(input: ReportInput): Promise<ActorReportContext> {
    const organizationId = required(input.organizationId, 'organizationId');
    const actorUserId = required(input.actorUserId, 'actorUserId');
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

    return {
      organizationId,
      actorUserId,
      roleCodes: memberships.map((membership) => membership.role.code),
    };
  }

  private canViewFinance(actor: ActorReportContext) {
    return actor.roleCodes.some((roleCode) => financeReportRoles.has(roleCode));
  }

  private canViewProcurement(actor: ActorReportContext) {
    return actor.roleCodes.some((roleCode) =>
      procurementReportRoles.has(roleCode),
    );
  }

  private assertReportAccess(
    actor: ActorReportContext,
    reportType: ReportType,
  ) {
    if (reportType === 'finance' && !this.canViewFinance(actor)) {
      throw new ForbiddenException('Finance report access denied');
    }

    if (reportType === 'procurement' && !this.canViewProcurement(actor)) {
      throw new ForbiddenException('Procurement report access denied');
    }
  }

  private buildReportPayload(
    input: ReportInput & {
      reportType: ReportType;
    },
  ) {
    switch (input.reportType) {
      case 'summary':
        return this.getSummary(input);
      case 'procurement':
        return this.getProcurementReport(input);
      case 'finance':
        return this.getFinanceReport(input);
      case 'audit':
        return this.getAuditReport(input);
      case 'integrations':
        return this.getIntegrationReport(input);
    }
  }

  private auditReportExport(input: {
    organizationId: string;
    actorUserId?: string;
    eventType: string;
    exportJobId: string;
    metadata: Prisma.InputJsonObject;
  }) {
    return this.auditEvents.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      entityType: 'ReportExportJob',
      entityId: input.exportJobId,
      metadata: input.metadata,
    });
  }

  private async procurementCounts(organizationId: string) {
    const [
      projects,
      suppliers,
      requisitions,
      rfqs,
      quotations,
      purchaseOrders,
      receipts,
      invoices,
    ] = await Promise.all([
      this.prisma.project.count({ where: { organizationId } }),
      this.prisma.supplier.count({ where: { organizationId } }),
      this.prisma.requisition.count({ where: { organizationId } }),
      this.prisma.rFQ.count({ where: { organizationId } }),
      this.prisma.quotation.count({ where: { organizationId } }),
      this.prisma.purchaseOrder.count({ where: { organizationId } }),
      this.prisma.receipt.count({ where: { organizationId } }),
      this.prisma.invoice.count({ where: { organizationId } }),
    ]);

    return {
      projects,
      suppliers,
      requisitions,
      rfqs,
      quotations,
      purchaseOrders,
      receipts,
      invoices,
      total:
        projects +
        suppliers +
        requisitions +
        rfqs +
        quotations +
        purchaseOrders +
        receipts +
        invoices,
    };
  }

  private async financeCounts(organizationId: string) {
    const [
      opportunities,
      applications,
      contracts,
      disbursements,
      ledgerEntries,
      profitLossStatements,
      closures,
      lossExceptions,
    ] = await Promise.all([
      this.prisma.procurementOpportunity.count({ where: { organizationId } }),
      this.prisma.mudarabahApplication.count({ where: { organizationId } }),
      this.prisma.mudarabahContract.count({ where: { organizationId } }),
      this.prisma.disbursement.count({ where: { organizationId } }),
      this.prisma.projectLedgerEntry.count({ where: { organizationId } }),
      this.prisma.profitLossStatement.count({ where: { organizationId } }),
      this.prisma.closurePack.count({ where: { organizationId } }),
      this.prisma.lossException.count({ where: { organizationId } }),
    ]);

    return {
      opportunities,
      applications,
      contracts,
      disbursements,
      ledgerEntries,
      profitLossStatements,
      closures,
      lossExceptions,
      total:
        opportunities +
        applications +
        contracts +
        disbursements +
        ledgerEntries +
        profitLossStatements +
        closures +
        lossExceptions,
    };
  }

  private async auditCounts(organizationId: string) {
    const [events, hashRecords, anchors, failedAnchors, pendingAnchors] =
      await Promise.all([
        this.prisma.auditEvent.count({ where: { organizationId } }),
        this.prisma.hashRecord.count({ where: { organizationId } }),
        this.prisma.auditAnchor.count({ where: { organizationId } }),
        this.prisma.auditAnchor.count({
          where: { organizationId, status: 'FAILED' },
        }),
        this.prisma.auditAnchor.count({
          where: {
            organizationId,
            status: { in: ['PENDING', 'ANCHOR_REQUESTED'] },
          },
        }),
      ]);

    return {
      events,
      hashRecords,
      anchors,
      failedAnchors,
      pendingAnchors,
      total: events + hashRecords + anchors,
    };
  }

  private async integrationCounts(organizationId: string) {
    const [
      outboxEvents,
      outboxPending,
      outboxFailed,
      reconciliationRecords,
      webhookSubscriptions,
      workerHeartbeats,
    ] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { organizationId } }),
      this.prisma.outboxEvent.count({
        where: { organizationId, status: 'PENDING' },
      }),
      this.prisma.outboxEvent.count({
        where: { organizationId, status: 'FAILED' },
      }),
      this.prisma.integrationReconciliationRecord.count({
        where: { organizationId },
      }),
      this.prisma.webhookSubscription.count({ where: { organizationId } }),
      this.prisma.workerHeartbeat.count(),
    ]);

    return {
      outboxEvents,
      outboxPending,
      outboxFailed,
      reconciliationRecords,
      webhookSubscriptions,
      workerHeartbeats,
      total:
        outboxEvents +
        reconciliationRecords +
        webhookSubscriptions +
        workerHeartbeats,
    };
  }

  private async statusCounts(
    model:
      | 'auditAnchor'
      | 'disbursement'
      | 'invoice'
      | 'integrationReconciliationRecord'
      | 'mudarabahApplication'
      | 'mudarabahContract'
      | 'outboxEvent'
      | 'procurementOpportunity'
      | 'purchaseOrder'
      | 'requisition',
    actor: ActorReportContext,
  ) {
    const where = { organizationId: actor.organizationId };

    switch (model) {
      case 'auditAnchor':
        return rowsToCounts(
          await this.prisma.auditAnchor.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'disbursement':
        return rowsToCounts(
          await this.prisma.disbursement.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'invoice':
        return rowsToCounts(
          await this.prisma.invoice.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'integrationReconciliationRecord':
        return rowsToCounts(
          await this.prisma.integrationReconciliationRecord.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'mudarabahApplication':
        return rowsToCounts(
          await this.prisma.mudarabahApplication.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'mudarabahContract':
        return rowsToCounts(
          await this.prisma.mudarabahContract.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'outboxEvent':
        return rowsToCounts(
          await this.prisma.outboxEvent.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'procurementOpportunity':
        return rowsToCounts(
          await this.prisma.procurementOpportunity.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'purchaseOrder':
        return rowsToCounts(
          await this.prisma.purchaseOrder.findMany({
            where,
            select: { status: true },
          }),
        );
      case 'requisition':
        return rowsToCounts(
          await this.prisma.requisition.findMany({
            where,
            select: { status: true },
          }),
        );
    }
  }

  private async hashRecordsByEntityType(organizationId: string) {
    const rows = await this.prisma.hashRecord.findMany({
      where: {
        organizationId,
      },
      select: {
        entityType: true,
      },
    });

    return rows.reduce<Record<string, number>>((counts, row) => {
      const key = row.entityType ?? 'unknown';
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }
}

function rowsToCounts(rows: Array<{ status: string | null }>) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const key = row.status ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function restrictedFinanceCounts() {
  return {
    opportunities: 0,
    applications: 0,
    contracts: 0,
    disbursements: 0,
    ledgerEntries: 0,
    profitLossStatements: 0,
    closures: 0,
    lossExceptions: 0,
    total: 0,
  };
}

function section(id: string, label: string, total: number): ReportSection {
  return {
    id,
    label,
    total,
    status: total > 0 ? 'ready' : 'empty',
  };
}

function required(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new BadRequestException(`${field} is required`);
  }

  return value.trim();
}

function reportExportBucket() {
  return process.env.MINIO_BUCKET || 'mepn-evidence';
}

function reportExportObjectName(exportJobId: string, reportType: ReportType) {
  return `reports/${reportType}/${exportJobId}.json`;
}
