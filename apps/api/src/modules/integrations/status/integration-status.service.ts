import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AuditAnchor,
  IntegrationReconciliationRecord,
  OutboxEvent,
  ReportExportJob,
  WorkerHeartbeat,
} from '@prisma/client';
import {
  missingFabricGatewayConfig,
  readFabricEnv,
} from '../../../config/fabric-env';
import { PrismaService } from '../../../database/prisma.service';
import {
  operationsTimelineCategories,
  operationsTimelineSeverities,
  sanitizeOperationsTimelineMetadata,
  sanitizeOperationsTimelineText,
  type OperationsTimelineCategory,
  type OperationsTimelineItemDto,
  type OperationsTimelineSeverity,
} from './operations-timeline.dto';

type OutboxWithReconciliation = OutboxEvent & {
  reconciliationRecord: IntegrationReconciliationRecord | null;
};

type ReconciliationWithOutbox = IntegrationReconciliationRecord & {
  outboxEvent: OutboxEvent | null;
};

type ListTimelineInput = {
  organizationId?: string;
  actorUserId?: string;
  category?: string;
  severity?: string;
  limit?: string | number;
};

const staleHeartbeatAfterMs = 120_000;

@Injectable()
export class IntegrationStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async listOutbox(organizationId?: string) {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        organizationId,
      },
      include: {
        reconciliationRecord: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return events.map(formatOutboxEvent);
  }

  async getOutboxEvent(id: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: {
        id,
      },
      include: {
        reconciliationRecord: true,
        webhookDeliveries: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Outbox event not found');
    }

    return {
      ...formatOutboxEvent(event),
      webhookDeliveries: event.webhookDeliveries,
    };
  }

  listReconciliation(organizationId?: string) {
    return this.prisma.integrationReconciliationRecord.findMany({
      where: {
        organizationId,
      },
      include: {
        outboxEvent: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async listWorkerHeartbeats() {
    const heartbeats = await this.prisma.workerHeartbeat.findMany({
      orderBy: {
        lastSeenAt: 'desc',
      },
      take: 20,
    });

    return heartbeats.map(formatWorkerHeartbeat);
  }

  async listTimeline(input: ListTimelineInput = {}) {
    const organizationId = input.organizationId?.trim();
    const actorUserId = input.actorUserId?.trim();
    const category = normalizeTimelineCategory(input.category);
    const severity = normalizeTimelineSeverity(input.severity);
    const limit = normalizeTimelineLimit(input.limit);

    if (organizationId && actorUserId) {
      await this.requireActiveMembership(organizationId, actorUserId);
    } else if (organizationId || actorUserId) {
      throw new BadRequestException(
        'organizationId and actorUserId are required together',
      );
    }

    const scopedWhere = organizationId ? { organizationId } : undefined;
    const [
      workerHeartbeats,
      outboxEvents,
      reconciliationRecords,
      auditAnchors,
      reportExportJobs,
    ] = await Promise.all([
      this.prisma.workerHeartbeat.findMany({
        orderBy: {
          lastSeenAt: 'desc',
        },
        take: limit,
      }),
      scopedWhere
        ? this.prisma.outboxEvent.findMany({
            where: scopedWhere,
            include: {
              reconciliationRecord: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: limit,
          })
        : Promise.resolve([]),
      scopedWhere
        ? this.prisma.integrationReconciliationRecord.findMany({
            where: scopedWhere,
            include: {
              outboxEvent: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: limit,
          })
        : Promise.resolve([]),
      scopedWhere
        ? this.prisma.auditAnchor.findMany({
            where: scopedWhere,
            orderBy: {
              createdAt: 'desc',
            },
            take: limit,
          })
        : Promise.resolve([]),
      scopedWhere
        ? this.prisma.reportExportJob.findMany({
            where: scopedWhere,
            orderBy: {
              updatedAt: 'desc',
            },
            take: limit,
          })
        : Promise.resolve([]),
    ]);

    return [
      ...workerHeartbeats.map(workerHeartbeatTimelineItem),
      ...outboxEvents.map(outboxTimelineItem),
      ...reconciliationRecords.map(reconciliationTimelineItem),
      ...auditAnchors.map(auditAnchorTimelineItem),
      ...reportExportJobs.map(reportExportTimelineItem),
    ]
      .filter((item) => !category || item.category === category)
      .filter((item) => !severity || item.severity === severity)
      .sort(
        (left, right) =>
          Date.parse(right.timestamp) - Date.parse(left.timestamp),
      )
      .slice(0, limit);
  }

  getFabricStatus() {
    const fabricEnv = readFabricEnv();
    const missingGatewayConfig =
      fabricEnv.mode === 'gateway' ? missingFabricGatewayConfig() : [];
    const gatewayConfigured =
      fabricEnv.mode === 'gateway' && missingGatewayConfig.length === 0;

    return {
      enabled: fabricEnv.enabled,
      mode: fabricEnv.mode,
      gatewayConfigured,
      realGatewayAdapterImplemented: true,
      anchorResultSource:
        fabricEnv.mode === 'gateway'
          ? 'worker-gateway-adapter'
          : 'mock-adapter',
      missingGatewayConfig,
      configuredChannel: redactConfiguredValue(fabricEnv.channel),
      configuredChaincode: redactConfiguredValue(fabricEnv.chaincode),
      configuredMspId: redactConfiguredValue(fabricEnv.mspId),
      submitTimeoutMs: fabricEnv.submitTimeoutMs,
      commitTimeoutMs: fabricEnv.commitTimeoutMs,
      securityBoundary: 'document hashes and minimal metadata only',
      message:
        fabricEnv.mode === 'gateway'
          ? 'Gateway mode is configured for the worker Fabric Gateway adapter. Real anchoring still requires deployed network material and successful worker processing.'
          : 'Fabric anchoring is running in explicit mock mode for prototype and local testing.',
    };
  }

  private async requireActiveMembership(
    organizationId: string,
    actorUserId: string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId: actorUserId,
        status: 'active',
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Active organization membership required');
    }
  }
}

function formatOutboxEvent(event: OutboxWithReconciliation) {
  return {
    id: event.id,
    organizationId: event.organizationId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    status: event.status,
    displayStatus: displayStatus(event),
    attempts: event.attempts,
    nextRunAt: event.nextRunAt,
    availableAt: event.availableAt,
    lastError: event.lastError,
    idempotencyKey: event.idempotencyKey,
    processedAt: event.processedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    reconciliationRecord: event.reconciliationRecord,
  };
}

function formatWorkerHeartbeat(heartbeat: WorkerHeartbeat) {
  const ageMs = Date.now() - heartbeat.lastSeenAt.getTime();
  const stale = ageMs > staleHeartbeatAfterMs;
  const healthStatus =
    heartbeat.status === 'disabled'
      ? 'not_configured'
      : stale
        ? 'unavailable'
        : heartbeat.status === 'running' || heartbeat.status === 'idle'
          ? 'healthy'
          : 'pending';

  return {
    id: heartbeat.id,
    workerName: heartbeat.workerName,
    queueName: heartbeat.queueName,
    status: heartbeat.status,
    healthStatus,
    lastSeenAt: heartbeat.lastSeenAt,
    processedCount: heartbeat.processedCount,
    failedCount: heartbeat.failedCount,
    metadata: heartbeat.metadata,
    message: workerHeartbeatMessage(heartbeat, stale),
    createdAt: heartbeat.createdAt,
    updatedAt: heartbeat.updatedAt,
  };
}

function workerHeartbeatMessage(heartbeat: WorkerHeartbeat, stale: boolean) {
  if (heartbeat.status === 'disabled') {
    return 'Worker polling is disabled by configuration.';
  }

  if (stale) {
    return 'Worker heartbeat is stale; treat the queue worker as unavailable until it reports again.';
  }

  if (heartbeat.status === 'running') {
    return 'Worker is actively polling or processing outbox events.';
  }

  if (heartbeat.status === 'idle') {
    return 'Worker is online and idle after its latest polling run.';
  }

  return `Worker reported ${heartbeat.status}.`;
}

function displayStatus(event: OutboxEvent) {
  if (event.status === 'PENDING' && event.attempts > 0 && event.lastError) {
    return 'RETRYING';
  }

  return event.status;
}

function redactConfiguredValue(value: string) {
  return value ? 'configured' : 'not_configured';
}

function workerHeartbeatTimelineItem(
  heartbeat: WorkerHeartbeat,
): OperationsTimelineItemDto {
  const formatted = formatWorkerHeartbeat(heartbeat);

  return {
    id: `worker:${heartbeat.id}`,
    timestamp: heartbeat.lastSeenAt.toISOString(),
    category: 'worker',
    severity: timelineSeverityFromHealth(formatted.healthStatus),
    title: `Worker ${heartbeat.workerName}`,
    summary: formatted.message,
    entityType: 'WorkerHeartbeat',
    entityId: heartbeat.id,
    status: heartbeat.status,
    metadataSummary: sanitizeOperationsTimelineMetadata({
      queueName: heartbeat.queueName,
      healthStatus: formatted.healthStatus,
      processedCount: heartbeat.processedCount,
      failedCount: heartbeat.failedCount,
    }),
  };
}

function outboxTimelineItem(event: OutboxWithReconciliation) {
  const status = displayStatus(event);

  return timelineItem({
    id: `outbox:${event.id}`,
    timestamp: (event.updatedAt ?? event.createdAt).toISOString(),
    category: 'outbox',
    severity: timelineSeverityFromStatus(status),
    title: `Outbox ${status}`,
    summary: `${event.eventType} for ${event.aggregateType} ${event.aggregateId} is ${status}.`,
    entityType: 'OutboxEvent',
    entityId: event.id,
    sourcePath: `/integrations/outbox/${event.id}`,
    status,
    metadataSummary: {
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      attempts: event.attempts,
      hasReconciliation: Boolean(event.reconciliationRecord),
    },
  });
}

function reconciliationTimelineItem(record: ReconciliationWithOutbox) {
  return timelineItem({
    id: `reconciliation:${record.id}`,
    timestamp: record.updatedAt.toISOString(),
    category: 'reconciliation',
    severity: timelineSeverityFromStatus(record.status),
    title: `${record.integrationType} reconciliation ${record.status}`,
    summary: `${record.integrationType} reconciliation for ${record.aggregateType} ${record.aggregateId} is ${record.status}.`,
    entityType: 'IntegrationReconciliationRecord',
    entityId: record.id,
    sourcePath: record.outboxEventId
      ? `/integrations/outbox/${record.outboxEventId}`
      : '/integrations',
    status: record.status,
    metadataSummary: {
      integrationType: record.integrationType,
      aggregateType: record.aggregateType,
      aggregateId: record.aggregateId,
      attempts: record.attempts,
      linkedOutbox: Boolean(record.outboxEvent),
    },
  });
}

function auditAnchorTimelineItem(anchor: AuditAnchor) {
  return timelineItem({
    id: `fabric:${anchor.id}`,
    timestamp: (anchor.anchoredAt ?? anchor.createdAt).toISOString(),
    category: 'fabric',
    severity: timelineSeverityFromStatus(anchor.status),
    title: `Fabric anchor ${anchor.status}`,
    summary: `${anchor.anchorType} anchor is ${anchor.status}.`,
    entityType: 'AuditAnchor',
    entityId: anchor.id,
    sourcePath: '/audit/search',
    evidencePath: 'docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md',
    status: anchor.status,
    metadataSummary: {
      anchorType: anchor.anchorType,
      hasTransactionId: Boolean(anchor.fabricTransactionId),
      blockNumber: anchor.fabricBlockNumber,
      channelConfigured: Boolean(anchor.fabricChannel),
      chaincodeConfigured: Boolean(anchor.fabricChaincode),
    },
  });
}

function reportExportTimelineItem(exportJob: ReportExportJob) {
  return timelineItem({
    id: `report:${exportJob.id}`,
    timestamp: exportJob.updatedAt.toISOString(),
    category: 'report',
    severity: timelineSeverityFromStatus(exportJob.status),
    title: `${exportJob.reportType} ${exportJob.format} report ${exportJob.status}`,
    summary: `${exportJob.reportType} report export (${exportJob.format}) is ${exportJob.status}.`,
    entityType: 'ReportExportJob',
    entityId: exportJob.id,
    sourcePath: '/reports',
    evidencePath: 'docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md',
    status: exportJob.status,
    metadataSummary: {
      reportType: exportJob.reportType,
      format: exportJob.format,
      hasObjectKey: Boolean(exportJob.objectKey),
    },
  });
}

function timelineItem(
  input: Omit<OperationsTimelineItemDto, 'summary' | 'title'> & {
    title: string;
    summary: string;
  },
): OperationsTimelineItemDto {
  return {
    ...input,
    title: sanitizeOperationsTimelineText(input.title) ?? '[redacted]',
    summary: sanitizeOperationsTimelineText(input.summary) ?? '[redacted]',
    metadataSummary: sanitizeOperationsTimelineMetadata(input.metadataSummary),
  };
}

function timelineSeverityFromHealth(
  healthStatus: string,
): OperationsTimelineSeverity {
  if (healthStatus === 'healthy') {
    return 'success';
  }

  if (healthStatus === 'unavailable') {
    return 'error';
  }

  if (healthStatus === 'degraded') {
    return 'warning';
  }

  return 'info';
}

function timelineSeverityFromStatus(
  status: string,
): OperationsTimelineSeverity {
  const normalized = status.toLowerCase();

  if (
    normalized.includes('failed') ||
    normalized.includes('error') ||
    normalized.includes('unavailable')
  ) {
    return 'error';
  }

  if (
    normalized.includes('retry') ||
    normalized.includes('pending') ||
    normalized.includes('requested')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('completed') ||
    normalized.includes('success') ||
    normalized.includes('verified') ||
    normalized.includes('anchored')
  ) {
    return 'success';
  }

  return 'info';
}

function normalizeTimelineCategory(value?: string) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (
    !operationsTimelineCategories.includes(
      normalized as OperationsTimelineCategory,
    )
  ) {
    throw new BadRequestException('Unsupported operations timeline category');
  }

  return normalized as OperationsTimelineCategory;
}

function normalizeTimelineSeverity(value?: string) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (
    !operationsTimelineSeverities.includes(
      normalized as OperationsTimelineSeverity,
    )
  ) {
    throw new BadRequestException('Unsupported operations timeline severity');
  }

  return normalized as OperationsTimelineSeverity;
}

function normalizeTimelineLimit(value?: string | number) {
  const parsed =
    typeof value === 'number'
      ? value
      : value?.trim()
        ? Number.parseInt(value, 10)
        : 50;

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new BadRequestException('Timeline limit must be a positive number');
  }

  return Math.min(parsed, 100);
}
