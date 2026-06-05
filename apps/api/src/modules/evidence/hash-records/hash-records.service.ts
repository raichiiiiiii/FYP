import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuditAnchor,
  IntegrationReconciliationRecord,
  OutboxEvent,
  Prisma,
} from '@prisma/client';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditHashService } from '../../audit/audit-hash.service';
import { OutboxService } from '../../outbox/outbox.service';
import { optionalText, requireText } from '../evidence.service-utils';
import {
  FabricChaincodeAnchorNotFoundError,
  FabricChaincodeQueryService,
  FabricChaincodeUnavailableError,
  type FabricGatewayQueryContext,
  type FabricReadAnchorResult,
} from './fabric-chaincode-query.service';

export type CreateHashRecordInput = {
  organizationId?: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  canonicalPayload?: Prisma.InputJsonValue;
};

type OutboxWithReconciliation = OutboxEvent & {
  reconciliationRecord: IntegrationReconciliationRecord | null;
};

export type FabricVerificationStatus =
  | 'NOT_REQUESTED'
  | 'ANCHOR_REQUESTED'
  | 'ANCHORED_MOCK'
  | 'ANCHORED_NOT_FULLY_VERIFIED'
  | 'VERIFIED'
  | 'FAILED'
  | 'FABRIC_UNAVAILABLE'
  | 'HASH_MISMATCH';

type DirectFabricStatus =
  | 'verified'
  | 'mismatch'
  | 'not_found'
  | 'unavailable'
  | 'pending'
  | 'mock'
  | 'failed'
  | 'not_requested'
  | 'anchored';

type FabricVerificationBaseResponse = Record<string, unknown> & {
  fabric: Record<string, unknown>;
};

@Injectable()
export class HashRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
    private readonly auditHash: AuditHashService,
    private readonly outbox: OutboxService,
    private readonly fabricChaincode?: FabricChaincodeQueryService,
  ) {}

  async create(input: CreateHashRecordInput) {
    const entityType = requireText(input.entityType, 'entityType');
    const entityId = requireText(input.entityId, 'entityId');
    const hash = input.canonicalPayload
      ? this.auditHash.hashCanonicalJson(input.canonicalPayload)
      : await this.auditHash.hashEntity(entityType, entityId);

    const record = await this.prisma.hashRecord.create({
      data: {
        organizationId: optionalText(input.organizationId),
        entityType,
        entityId,
        hashAlgorithm: hash.hashAlgorithm,
        canonicalHash: hash.canonicalHash,
        canonicalJson: hash.canonicalJson,
        canonicalText: hash.canonicalText,
      },
    });

    await this.auditEvents.create({
      organizationId: record.organizationId || undefined,
      actorUserId: input.actorUserId,
      eventType: 'HASH_RECORD_CREATED',
      entityType: 'HashRecord',
      entityId: record.id,
      metadata: {
        hashedEntityType: record.entityType,
        hashedEntityId: record.entityId,
        canonicalHash: record.canonicalHash,
        hashAlgorithm: record.hashAlgorithm,
      },
    });

    await this.outbox.create({
      organizationId: record.organizationId || undefined,
      eventType: 'FABRIC_ANCHOR_REQUESTED',
      aggregateType: record.entityType,
      aggregateId: record.entityId,
      idempotencyKey: `fabric:${record.organizationId || 'global'}:${record.entityType}:${record.entityId}:${record.canonicalHash}`,
      payload: {
        integrationType: 'FABRIC',
        hashRecordId: record.id,
        entityType: record.entityType,
        entityId: record.entityId,
        organizationId: record.organizationId,
        canonicalHash: record.canonicalHash,
        timestamp: record.createdAt.toISOString(),
      },
    });

    return this.getById(record.id);
  }

  async getById(id: string) {
    const record = await this.prisma.hashRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Hash record not found');
    }

    return {
      ...record,
      anchorStatus: await this.anchorStatusFor(record),
    };
  }

  async verify(id: string) {
    const record = await this.prisma.hashRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Hash record not found');
    }

    const recomputed = await this.recompute(record);
    const valid = recomputed.canonicalHash === record.canonicalHash;

    await this.prisma.hashRecord.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
      },
    });

    return {
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      hashAlgorithm: record.hashAlgorithm,
      valid,
      storedHash: record.canonicalHash,
      computedHash: recomputed.canonicalHash,
      source: recomputed.source,
      anchorStatus: await this.anchorStatusFor(record),
      verifiedAt: new Date().toISOString(),
    };
  }

  async fabricVerification(id: string) {
    const record = await this.prisma.hashRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Hash record not found');
    }

    const [recomputed, anchor, outboxEvent] = await Promise.all([
      this.recompute(record),
      this.latestAnchorFor(record),
      this.latestOutboxFor(record),
    ]);
    const localHashMatch = recomputed.canonicalHash === record.canonicalHash;
    const evidence = this.fabricEvidenceFor(anchor, outboxEvent);
    const verification = this.fabricVerificationStatus({
      localHashMatch,
      anchor,
      outboxEvent,
    });
    const baseResponse = {
      id: record.id,
      hashRecordId: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      mode: this.directModeFor(anchor),
      verified: verification.verified,
      status: this.directStatusFor(verification.status),
      localCanonicalHash: recomputed.canonicalHash,
      storedAnchorHash: anchor?.rootHash ?? null,
      onChainAnchorHash: null,
      transactionId: anchor?.fabricTransactionId ?? null,
      blockNumber: anchor?.fabricBlockNumber
        ? String(anchor.fabricBlockNumber)
        : null,
      channelName: anchor?.fabricChannel ?? null,
      chaincodeName: anchor?.fabricChaincode ?? null,
      fabricPeerEndpoint: null,
      gatewayUrl: null,
      mspId: null,
      identity: null,
      checkedAt: new Date().toISOString(),
      mismatchReason: verification.verified
        ? null
        : this.mismatchReasonFor(verification.status),
      localHash: {
        algorithm: record.hashAlgorithm,
        storedHash: record.canonicalHash,
        computedHash: recomputed.canonicalHash,
        match: localHashMatch,
        source: recomputed.source,
      },
      verificationStatus: verification.status,
      reviewerSummary: verification.reviewerSummary,
      fabric: {
        chaincodeQueryAvailable: Boolean(
          this.fabricChaincode && anchor?.anchorType === 'FABRIC',
        ),
        chaincodeHashMatch: null,
        chaincodeVerificationStatus: 'NOT_QUERIED',
        anchor,
        outboxEvent: evidence.outboxEvent,
        reconciliation: evidence.reconciliation,
        gateway: null,
        onChainAnchor: null,
      },
    };

    if (!localHashMatch || !anchor || !this.canQueryRealFabricAnchor(anchor)) {
      return baseResponse;
    }

    if (anchor.rootHash.toLowerCase() !== recomputed.canonicalHash) {
      return {
        ...baseResponse,
        verified: false,
        status: 'mismatch',
        verificationStatus: 'HASH_MISMATCH',
        mismatchReason:
          'Stored AuditAnchor hash does not match the local canonical hash.',
        reviewerSummary:
          'A real Fabric anchor exists, but the stored anchor hash does not match the local canonical hash.',
        fabric: {
          ...baseResponse.fabric,
          chaincodeVerificationStatus: 'LOCAL_ANCHOR_HASH_MISMATCH',
        },
      };
    }

    if (!this.hasRealTransactionMetadata(anchor)) {
      return {
        ...baseResponse,
        verified: false,
        status: 'unavailable',
        mismatchReason:
          'Real Fabric transaction metadata is missing from the stored anchor.',
        reviewerSummary:
          'A real Fabric anchor record exists, but it lacks the transaction metadata required for reviewer-safe verification.',
        fabric: {
          ...baseResponse.fabric,
          chaincodeVerificationStatus: 'LOCAL_TRANSACTION_METADATA_MISSING',
        },
      };
    }

    const anchorId = this.anchorIdFor(record, anchor, outboxEvent);

    if (!anchorId) {
      return {
        ...baseResponse,
        verified: false,
        status: 'unavailable',
        mismatchReason:
          'Unable to derive the deterministic Fabric anchor id for chaincode lookup.',
        reviewerSummary:
          'A real Fabric anchor record exists, but the API could not derive the anchor id required for ReadAnchor.',
        fabric: {
          ...baseResponse.fabric,
          chaincodeVerificationStatus: 'ANCHOR_ID_UNAVAILABLE',
        },
      };
    }

    if (!this.fabricChaincode) {
      return {
        ...baseResponse,
        verified: false,
        status: 'unavailable',
        mismatchReason:
          'API-side Fabric chaincode query client is not configured.',
        reviewerSummary:
          'A real Fabric anchor exists, but the API cannot query chaincode in this runtime.',
        fabric: {
          ...baseResponse.fabric,
          chaincodeVerificationStatus: 'UNAVAILABLE',
        },
      };
    }

    try {
      const chaincode = await this.fabricChaincode.readAnchor(anchorId);
      return this.fabricVerificationFromChaincode({
        baseResponse,
        anchor,
        onChainAnchor: chaincode.anchor,
        gateway: chaincode.context,
        localCanonicalHash: recomputed.canonicalHash,
      });
    } catch (error) {
      if (error instanceof FabricChaincodeAnchorNotFoundError) {
        return {
          ...baseResponse,
          verified: false,
          status: 'not_found',
          mismatchReason: error.message,
          reviewerSummary:
            'The local database has a real Fabric anchor record, but ReadAnchor did not find the anchor on chaincode.',
          fabric: {
            ...baseResponse.fabric,
            chaincodeVerificationStatus: 'NOT_FOUND',
          },
        };
      }

      const message =
        error instanceof FabricChaincodeUnavailableError
          ? error.message
          : 'Fabric chaincode query failed unexpectedly.';

      return {
        ...baseResponse,
        verified: false,
        status: 'unavailable',
        mismatchReason: message,
        reviewerSummary:
          'The API could not complete the Fabric chaincode verification query. Treat this evidence as not verified until the query succeeds.',
        fabric: {
          ...baseResponse.fabric,
          chaincodeVerificationStatus: 'UNAVAILABLE',
        },
      };
    }
  }

  private async anchorStatusFor(record: {
    organizationId: string | null;
    entityType: string;
    entityId: string;
    canonicalHash: string;
  }) {
    const [anchor, outboxEvent] = await Promise.all([
      this.prisma.auditAnchor.findFirst({
        where: {
          organizationId: record.organizationId || undefined,
          rootHash: record.canonicalHash,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.outboxEvent.findFirst({
        where: {
          organizationId: record.organizationId || undefined,
          eventType: 'FABRIC_ANCHOR_REQUESTED',
          aggregateType: record.entityType,
          aggregateId: record.entityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    if (anchor) {
      return {
        status: anchor.status,
        anchorType: anchor.anchorType,
        anchoredAt: anchor.anchoredAt,
        rootHash: anchor.rootHash,
        fabricTransactionId: anchor.fabricTransactionId,
        fabricBlockNumber: anchor.fabricBlockNumber,
        fabricChannel: anchor.fabricChannel,
        fabricChaincode: anchor.fabricChaincode,
        fabricCommitStatus: anchor.fabricCommitStatus,
        fabricEndorsementStatus: anchor.fabricEndorsementStatus,
        fabricVerifiedAt: anchor.fabricVerifiedAt,
        metadata: anchor.metadata,
      };
    }

    if (outboxEvent) {
      return {
        status: 'ANCHOR_REQUESTED',
        anchorType: 'FABRIC_MOCK',
        outboxStatus: outboxEvent.status,
        attempts: outboxEvent.attempts,
        requestedAt: outboxEvent.createdAt,
      };
    }

    return {
      status: 'NOT_REQUESTED',
      anchorType: 'FABRIC_MOCK',
    };
  }

  private latestAnchorFor(record: {
    organizationId: string | null;
    canonicalHash: string;
  }) {
    return this.prisma.auditAnchor.findFirst({
      where: {
        organizationId: record.organizationId || undefined,
        rootHash: record.canonicalHash,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private latestOutboxFor(record: {
    organizationId: string | null;
    entityType: string;
    entityId: string;
  }): Promise<OutboxWithReconciliation | null> {
    return this.prisma.outboxEvent.findFirst({
      where: {
        organizationId: record.organizationId || undefined,
        eventType: 'FABRIC_ANCHOR_REQUESTED',
        aggregateType: record.entityType,
        aggregateId: record.entityId,
      },
      include: {
        reconciliationRecord: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private fabricEvidenceFor(
    anchor: AuditAnchor | null,
    outboxEvent: OutboxWithReconciliation | null,
  ) {
    return {
      outboxEvent: outboxEvent
        ? {
            id: outboxEvent.id,
            status: outboxEvent.status,
            attempts: outboxEvent.attempts,
            lastError: outboxEvent.lastError,
            idempotencyKey: outboxEvent.idempotencyKey,
            processedAt: outboxEvent.processedAt,
            createdAt: outboxEvent.createdAt,
          }
        : null,
      reconciliation: outboxEvent?.reconciliationRecord
        ? {
            id: outboxEvent.reconciliationRecord.id,
            status: outboxEvent.reconciliationRecord.status,
            externalReference:
              outboxEvent.reconciliationRecord.externalReference,
            lastError: outboxEvent.reconciliationRecord.lastError,
            attempts: outboxEvent.reconciliationRecord.attempts,
            updatedAt: outboxEvent.reconciliationRecord.updatedAt,
          }
        : null,
      anchor,
    };
  }

  private fabricVerificationStatus(input: {
    localHashMatch: boolean;
    anchor: AuditAnchor | null;
    outboxEvent: OutboxWithReconciliation | null;
  }): {
    status: FabricVerificationStatus;
    verified: boolean;
    reviewerSummary: string;
  } {
    if (!input.localHashMatch) {
      return {
        status: 'HASH_MISMATCH',
        verified: false,
        reviewerSummary:
          'The current record does not match the stored canonical hash. The Fabric anchor cannot be trusted for this local record state.',
      };
    }

    if (input.anchor) {
      if (
        input.anchor.anchorType === 'FABRIC_MOCK' ||
        input.anchor.status === 'ANCHORED_MOCK'
      ) {
        return {
          status: 'ANCHORED_MOCK',
          verified: false,
          reviewerSummary:
            'A mock anchor exists for this hash. Mock anchors are useful for workflow testing but are never proof of real Fabric verification.',
        };
      }

      if (input.anchor.status === 'FAILED') {
        return {
          status: 'FAILED',
          verified: false,
          reviewerSummary:
            'Fabric anchoring failed for this hash. Inspect the outbox and reconciliation record before relying on this evidence.',
        };
      }

      if (input.anchor.status === 'FABRIC_UNAVAILABLE') {
        return {
          status: 'FABRIC_UNAVAILABLE',
          verified: false,
          reviewerSummary:
            'Fabric was unavailable when this hash was processed. The local hash exists, but there is no verified on-chain proof.',
        };
      }

      const hasRealTransactionMetadata = Boolean(
        input.anchor.fabricTransactionId &&
        input.anchor.fabricChannel &&
        input.anchor.fabricChaincode,
      );

      if (
        input.anchor.anchorType === 'FABRIC' &&
        (input.anchor.status === 'VERIFIED' ||
          input.anchor.status === 'ANCHORED') &&
        hasRealTransactionMetadata
      ) {
        return {
          status: 'ANCHORED_NOT_FULLY_VERIFIED',
          verified: false,
          reviewerSummary:
            'A real Fabric anchor with transaction metadata exists. Direct chaincode verification is required before this can be treated as verified.',
        };
      }

      return {
        status: 'FAILED',
        verified: false,
        reviewerSummary:
          'Anchor metadata is incomplete or in an unsupported state. Treat this hash as not verified.',
      };
    }

    const reconciliationStatus =
      input.outboxEvent?.reconciliationRecord?.status ||
      input.outboxEvent?.status;

    if (reconciliationStatus === 'FABRIC_UNAVAILABLE') {
      return {
        status: 'FABRIC_UNAVAILABLE',
        verified: false,
        reviewerSummary:
          'The anchor request reached the integration boundary, but Fabric was unavailable.',
      };
    }

    if (
      reconciliationStatus === 'FAILED' ||
      reconciliationStatus === 'FABRIC_CONFIGURATION_ERROR'
    ) {
      return {
        status: 'FAILED',
        verified: false,
        reviewerSummary:
          'The Fabric anchor request failed before a usable anchor record was created.',
      };
    }

    if (input.outboxEvent) {
      return {
        status: 'ANCHOR_REQUESTED',
        verified: false,
        reviewerSummary:
          'A Fabric anchor request exists and is still pending or retrying. No verified Fabric proof exists yet.',
      };
    }

    return {
      status: 'NOT_REQUESTED',
      verified: false,
      reviewerSummary:
        'No Fabric anchor request or anchor record exists for this hash record.',
    };
  }

  private async recompute(record: {
    entityType: string;
    entityId: string;
    canonicalJson: Prisma.JsonValue;
  }) {
    try {
      return {
        ...(await this.auditHash.hashEntity(
          record.entityType,
          record.entityId,
        )),
        source: 'live-entity',
      };
    } catch {
      return {
        ...this.auditHash.hashCanonicalJson(record.canonicalJson),
        source: 'stored-canonical-json',
      };
    }
  }

  private fabricVerificationFromChaincode(input: {
    baseResponse: FabricVerificationBaseResponse;
    anchor: AuditAnchor;
    onChainAnchor: FabricReadAnchorResult;
    gateway: FabricGatewayQueryContext;
    localCanonicalHash: string;
  }) {
    const onChainHash = input.onChainAnchor.canonicalHash.toLowerCase();
    const storedAnchorHash = input.anchor.rootHash.toLowerCase();
    const hashMatch =
      input.localCanonicalHash === storedAnchorHash &&
      input.localCanonicalHash === onChainHash;

    if (!hashMatch) {
      return {
        ...input.baseResponse,
        mode: 'fabric-gateway',
        verified: false,
        status: 'mismatch' as const,
        onChainAnchorHash: onChainHash,
        channelName: input.gateway.channelName,
        chaincodeName: input.gateway.chaincodeName,
        fabricPeerEndpoint: input.gateway.fabricPeerEndpoint,
        gatewayUrl: input.gateway.gatewayUrl,
        mspId: input.gateway.mspId,
        identity: input.gateway.identity,
        mismatchReason:
          'Local, stored anchor, and on-chain canonical hashes do not all match.',
        reviewerSummary:
          'ReadAnchor returned an anchor, but the on-chain hash does not match the local and stored anchor hashes.',
        verificationStatus: 'HASH_MISMATCH' as const,
        fabric: {
          ...input.baseResponse.fabric,
          chaincodeHashMatch: false,
          chaincodeVerificationStatus: 'MISMATCH',
          gateway: input.gateway,
          onChainAnchor: input.onChainAnchor,
        },
      };
    }

    return {
      ...input.baseResponse,
      mode: 'fabric-gateway',
      verified: true,
      status: 'verified' as const,
      onChainAnchorHash: onChainHash,
      channelName: input.gateway.channelName,
      chaincodeName: input.gateway.chaincodeName,
      fabricPeerEndpoint: input.gateway.fabricPeerEndpoint,
      gatewayUrl: input.gateway.gatewayUrl,
      mspId: input.gateway.mspId,
      identity: input.gateway.identity,
      mismatchReason: null,
      reviewerSummary:
        'The local canonical hash, stored AuditAnchor hash, and on-chain ReadAnchor hash match. This is a real Fabric Gateway verification result.',
      verificationStatus: 'VERIFIED' as const,
      fabric: {
        ...input.baseResponse.fabric,
        chaincodeHashMatch: true,
        chaincodeVerificationStatus: 'VERIFIED',
        gateway: input.gateway,
        onChainAnchor: input.onChainAnchor,
      },
    };
  }

  private canQueryRealFabricAnchor(anchor: AuditAnchor) {
    return (
      anchor.anchorType === 'FABRIC' &&
      anchor.status !== 'FAILED' &&
      anchor.status !== 'FABRIC_UNAVAILABLE'
    );
  }

  private hasRealTransactionMetadata(anchor: AuditAnchor) {
    return Boolean(
      anchor.fabricTransactionId &&
      anchor.fabricChannel &&
      anchor.fabricChaincode,
    );
  }

  private anchorIdFor(
    record: {
      organizationId: string | null;
      entityType: string;
      entityId: string;
      canonicalHash: string;
    },
    anchor: AuditAnchor,
    outboxEvent: OutboxWithReconciliation | null,
  ) {
    const anchorId =
      stringFromJson(anchor.metadata, 'anchorId') ||
      stringFromJson(
        outboxEvent?.reconciliationRecord?.responsePayload,
        'anchorId',
      );

    if (anchorId) {
      return anchorId;
    }

    const idempotencyKey =
      stringFromJson(anchor.metadata, 'idempotencyKey') ||
      stringFromJson(
        outboxEvent?.reconciliationRecord?.responsePayload,
        'idempotencyKey',
      ) ||
      outboxEvent?.idempotencyKey ||
      `fabric:${record.organizationId || 'global'}:${record.entityType}:${record.entityId}:${record.canonicalHash}`;

    return createHash('sha256').update(idempotencyKey).digest('hex');
  }

  private directModeFor(anchor: AuditAnchor | null) {
    if (anchor?.anchorType === 'FABRIC') {
      return 'fabric-gateway';
    }

    return 'mock';
  }

  private directStatusFor(
    status: FabricVerificationStatus,
  ): DirectFabricStatus {
    switch (status) {
      case 'VERIFIED':
        return 'verified';
      case 'HASH_MISMATCH':
        return 'mismatch';
      case 'FABRIC_UNAVAILABLE':
        return 'unavailable';
      case 'ANCHOR_REQUESTED':
        return 'pending';
      case 'ANCHORED_MOCK':
        return 'mock';
      case 'FAILED':
        return 'failed';
      case 'NOT_REQUESTED':
        return 'not_requested';
      case 'ANCHORED_NOT_FULLY_VERIFIED':
        return 'anchored';
    }
  }

  private mismatchReasonFor(status: FabricVerificationStatus) {
    if (status === 'VERIFIED') {
      return null;
    }

    if (status === 'HASH_MISMATCH') {
      return 'Local canonical hash does not match the stored hash record.';
    }

    if (status === 'ANCHORED_MOCK') {
      return 'Mock anchors are not real Fabric verification evidence.';
    }

    return null;
  }
}

function stringFromJson(
  value: Prisma.JsonValue | null | undefined,
  key: string,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const raw = value[key];

  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}
