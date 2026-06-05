import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  IntegrationReconciliationRecord,
  OutboxEvent,
  WorkerHeartbeat,
} from '@prisma/client';
import {
  missingFabricGatewayConfig,
  readFabricEnv,
} from '../../../config/fabric-env';
import { PrismaService } from '../../../database/prisma.service';

type OutboxWithReconciliation = OutboxEvent & {
  reconciliationRecord: IntegrationReconciliationRecord | null;
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
