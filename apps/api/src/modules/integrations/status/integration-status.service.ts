import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  IntegrationReconciliationRecord,
  OutboxEvent,
} from '@prisma/client';
import {
  fabricGatewayRequiredVariables,
  readFabricEnv,
} from '../../../config/fabric-env';
import { PrismaService } from '../../../database/prisma.service';

type OutboxWithReconciliation = OutboxEvent & {
  reconciliationRecord: IntegrationReconciliationRecord | null;
};

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

  getFabricStatus() {
    const fabricEnv = readFabricEnv();
    const missingGatewayConfig =
      fabricEnv.mode === 'gateway'
        ? fabricGatewayRequiredVariables.filter(
            (variable) => !process.env[variable]?.trim(),
          )
        : [];
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

function displayStatus(event: OutboxEvent) {
  if (event.status === 'PENDING' && event.attempts > 0 && event.lastError) {
    return 'RETRYING';
  }

  return event.status;
}

function redactConfiguredValue(value: string) {
  return value ? 'configured' : 'not_configured';
}
