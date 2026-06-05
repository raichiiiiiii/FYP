import { createPrivateKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import * as grpc from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import {
  connect,
  signers,
  type ConnectOptions,
  type Contract,
  type Gateway,
} from '@hyperledger/fabric-gateway';
import { readFabricEnv } from '../../../config/fabric-env';

export type FabricGatewayQueryContext = {
  mode: 'fabric-gateway';
  channelName: string;
  chaincodeName: string;
  fabricPeerEndpoint: string;
  gatewayUrl: string;
  mspId: string;
  identity: string;
};

export type FabricReadAnchorResult = {
  anchorId: string;
  organizationId?: string;
  entityType: string;
  entityId: string;
  canonicalHash: string;
  hashAlgorithm?: string;
  timestamp?: string;
  idempotencyKey?: string;
  metadataHash?: string;
};

export class FabricChaincodeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FabricChaincodeUnavailableError';
  }
}

export class FabricChaincodeAnchorNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FabricChaincodeAnchorNotFoundError';
  }
}

@Injectable()
export class FabricChaincodeQueryService {
  describeGateway(): FabricGatewayQueryContext {
    const env = readGatewayEnv();

    return {
      mode: 'fabric-gateway',
      channelName: env.channel,
      chaincodeName: env.chaincode,
      fabricPeerEndpoint: env.peerEndpoint,
      gatewayUrl: env.gatewayUrl,
      mspId: env.mspId,
      identity: env.identity || env.mspId,
    };
  }

  async readAnchor(anchorId: string): Promise<{
    anchor: FabricReadAnchorResult;
    context: FabricGatewayQueryContext;
  }> {
    const env = readGatewayEnv();
    const context = this.describeGateway();

    let grpcClient: grpc.Client | null = null;
    let gateway: Gateway | null = null;

    try {
      const [identityCert, privateKeyPem, tlsCert] = await Promise.all([
        readFile(env.identityCertPath),
        readFile(env.privateKeyPath),
        readFile(env.tlsCertPath),
      ]);

      grpcClient = new grpc.Client(
        env.peerEndpoint,
        grpc.credentials.createSsl(tlsCert),
        {
          'grpc.ssl_target_name_override': env.gatewayHostAlias,
          'grpc.default_authority': env.gatewayHostAlias,
        },
      );

      gateway = connect({
        client: grpcClient,
        identity: {
          mspId: env.mspId,
          credentials: identityCert,
        },
        signer: signers.newPrivateKeySigner(createPrivateKey(privateKeyPem)),
        evaluateOptions: deadlineOptions(env.submitTimeoutMs),
      });

      const contract = gateway
        .getNetwork(env.channel)
        .getContract(env.chaincode);

      return {
        anchor: normalizeReadAnchorResult(
          await evaluateReadAnchor(contract, anchorId),
        ),
        context,
      };
    } catch (error) {
      if (isAnchorNotFoundError(error)) {
        throw new FabricChaincodeAnchorNotFoundError(
          `Fabric anchor ${anchorId} was not found on chaincode`,
        );
      }

      if (isLocalMaterialError(error)) {
        throw new FabricChaincodeUnavailableError(
          'Fabric Gateway secret/config material is missing or unreadable',
        );
      }

      throw new FabricChaincodeUnavailableError(
        `Fabric chaincode query unavailable: ${sanitizeError(error)}`,
      );
    } finally {
      gateway?.close();
      grpcClient?.close();
    }
  }
}

async function evaluateReadAnchor(contract: Contract, anchorId: string) {
  const result = await contract.evaluateTransaction('ReadAnchor', anchorId);
  const decoded = Buffer.from(result).toString('utf8');
  const parsed = JSON.parse(decoded) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ReadAnchor did not return a JSON object');
  }

  return parsed as Record<string, unknown>;
}

function normalizeReadAnchorResult(
  parsed: Record<string, unknown>,
): FabricReadAnchorResult {
  const anchorId = requireString(parsed.anchorId, 'anchorId');
  const canonicalHash = requireString(parsed.canonicalHash, 'canonicalHash');

  return {
    anchorId,
    canonicalHash: canonicalHash.toLowerCase(),
    entityType: requireString(parsed.entityType, 'entityType'),
    entityId: requireString(parsed.entityId, 'entityId'),
    organizationId: optionalString(parsed.organizationId),
    hashAlgorithm: optionalString(parsed.hashAlgorithm),
    timestamp: optionalString(parsed.timestamp),
    idempotencyKey: optionalString(parsed.idempotencyKey),
    metadataHash: optionalString(parsed.metadataHash),
  };
}

function readGatewayEnv() {
  try {
    const env = readFabricEnv();

    if (env.mode !== 'gateway') {
      throw new FabricChaincodeUnavailableError(
        'Fabric Gateway mode is not configured for API verification',
      );
    }

    return env;
  } catch (error) {
    if (error instanceof FabricChaincodeUnavailableError) {
      throw error;
    }

    throw new FabricChaincodeUnavailableError(sanitizeError(error));
  }
}

function deadlineOptions(timeoutMs: number): ConnectOptions['evaluateOptions'] {
  return () => ({
    deadline: Date.now() + timeoutMs,
  });
}

function requireString(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`ReadAnchor result is missing ${name}`);
  }

  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isAnchorNotFoundError(error: unknown) {
  return /not found/i.test(errorMessage(error));
}

function isLocalMaterialError(error: unknown) {
  const message = errorMessage(error);

  return (
    /\bENOENT\b/i.test(message) ||
    /\bEACCES\b/i.test(message) ||
    /no such file/i.test(message) ||
    /permission denied/i.test(message)
  );
}

function sanitizeError(error: unknown) {
  return errorMessage(error)
    .replace(/-----BEGIN[\s\S]*?-----END [^-]+-----/g, '[redacted-pem]')
    .replace(/([A-Za-z]:)?[\\/][^\s'"]+/g, '[redacted-path]');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
