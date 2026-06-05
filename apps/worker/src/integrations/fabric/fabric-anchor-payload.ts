import { createHash } from 'node:crypto';

export type FabricAnchorCommand = {
  anchorId: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  canonicalHash: string;
  timestamp: string;
  idempotencyKey: string;
  metadataJson: string;
  chaincodeArgs: string[];
};

const sha256HexPattern = /^[a-fA-F0-9]{64}$/;

export function buildFabricAnchorCommand(
  payload: Record<string, unknown>,
): FabricAnchorCommand {
  const organizationId = optionalString(payload.organizationId);
  const entityType = requiredString(payload.entityType, 'entityType');
  const entityId = requiredString(payload.entityId, 'entityId');
  const canonicalHash = requiredString(payload.canonicalHash, 'canonicalHash');
  const timestamp =
    optionalString(payload.timestamp) || new Date().toISOString();
  const idempotencyKey =
    optionalString(payload.idempotencyKey) ||
    deriveFabricIdempotencyKey({
      organizationId,
      entityType,
      entityId,
      canonicalHash,
    });

  if (!sha256HexPattern.test(canonicalHash)) {
    throw new Error('canonicalHash must be a SHA-256 hex digest');
  }

  const anchorId = calculateFabricAnchorId(idempotencyKey);
  const metadataJson = JSON.stringify({
    hashRecordId: optionalString(payload.hashRecordId) || undefined,
    source: 'mepn-worker',
  });

  return {
    anchorId,
    organizationId,
    entityType,
    entityId,
    canonicalHash: canonicalHash.toLowerCase(),
    timestamp,
    idempotencyKey,
    metadataJson,
    chaincodeArgs: [
      anchorId,
      organizationId,
      entityType,
      entityId,
      canonicalHash.toLowerCase(),
      timestamp,
      idempotencyKey,
      metadataJson,
    ],
  };
}

export function deriveFabricIdempotencyKey(input: {
  organizationId?: string;
  entityType: string;
  entityId: string;
  canonicalHash: string;
}) {
  return `fabric:${input.organizationId || 'global'}:${input.entityType}:${input.entityId}:${input.canonicalHash}`;
}

export function calculateFabricAnchorId(idempotencyKey: string) {
  return createHash('sha256').update(idempotencyKey.trim()).digest('hex');
}

function requiredString(payloadValue: unknown, name: string) {
  const value = optionalString(payloadValue);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function optionalString(payloadValue: unknown) {
  return typeof payloadValue === 'string' ? payloadValue.trim() : '';
}
