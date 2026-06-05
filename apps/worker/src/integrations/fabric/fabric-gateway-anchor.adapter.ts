import { Inject, Injectable, Optional } from '@nestjs/common';
import { readFabricEnv } from '../../config/fabric-env';
import { IntegrationAdapterError } from '../integration-adapter-error';
import type { AdapterResult } from '../integration-adapter.types';
import {
  buildFabricAnchorCommand,
  type FabricAnchorCommand,
} from './fabric-anchor-payload';
import {
  FabricGatewayClientFactory,
  type FabricGatewayClient,
} from './fabric-gateway-client.factory';

@Injectable()
export class FabricGatewayAnchorAdapter {
  constructor(
    @Optional()
    @Inject(FabricGatewayClientFactory)
    private readonly clientFactory = new FabricGatewayClientFactory(),
  ) {}

  async anchor(payload: Record<string, unknown>): Promise<AdapterResult> {
    let command: FabricAnchorCommand;

    try {
      command = buildFabricAnchorCommand(payload);
    } catch (error) {
      throw new IntegrationAdapterError(
        error instanceof Error
          ? error.message
          : 'Invalid Fabric anchor payload',
        'FAILED',
        false,
      );
    }

    const env = readFabricEnv();
    let client: FabricGatewayClient | undefined;

    try {
      client = await this.clientFactory.create(env);
      const result = await client.submitCreateAnchor(command.chaincodeArgs);

      return {
        integrationType: 'FABRIC',
        externalReference: result.transactionId,
        status: 'ANCHORED',
        responsePayload: {
          anchorId: command.anchorId,
          entityType: command.entityType,
          entityId: command.entityId,
          canonicalHash: command.canonicalHash,
          idempotencyKey: command.idempotencyKey,
          fabricTransactionId: result.transactionId,
          fabricBlockNumber: result.blockNumber ?? null,
          fabricChannel: env.channel,
          fabricChaincode: env.chaincode,
          fabricCommitStatus: result.commitStatus ?? null,
          status: 'ANCHORED',
          anchoredAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof IntegrationAdapterError) {
        throw error;
      }

      throw classifyGatewayError(error);
    } finally {
      client?.close();
    }
  }
}

function classifyGatewayError(error: unknown): IntegrationAdapterError {
  const message =
    error instanceof Error ? error.message : 'Unknown Fabric Gateway error';
  const lower = message.toLowerCase();

  if (
    lower.includes('enoent') ||
    lower.includes('private key') ||
    lower.includes('certificate') ||
    lower.includes('permission denied')
  ) {
    return new IntegrationAdapterError(
      message,
      'FABRIC_CONFIGURATION_ERROR',
      false,
    );
  }

  if (
    lower.includes('idempotency conflict') ||
    lower.includes('canonicalhash must be') ||
    lower.includes('anchorid must equal')
  ) {
    return new IntegrationAdapterError(message, 'FAILED', false);
  }

  if (
    lower.includes('deadline') ||
    lower.includes('timeout') ||
    lower.includes('unavailable') ||
    lower.includes('connection') ||
    lower.includes('14 unavailable')
  ) {
    return new IntegrationAdapterError(message, 'FABRIC_UNAVAILABLE', true);
  }

  return new IntegrationAdapterError(message, 'FAILED', true);
}
