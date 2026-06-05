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

@Injectable()
export class HashRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
    private readonly auditHash: AuditHashService,
    private readonly outbox: OutboxService,
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

    return {
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      localHash: {
        algorithm: record.hashAlgorithm,
        storedHash: record.canonicalHash,
        computedHash: recomputed.canonicalHash,
        match: localHashMatch,
        source: recomputed.source,
      },
      verificationStatus: verification.status,
      verified: verification.verified,
      reviewerSummary: verification.reviewerSummary,
      fabric: {
        chaincodeQueryAvailable: false,
        chaincodeHashMatch: null,
        chaincodeVerificationStatus: 'NOT_IMPLEMENTED',
        anchor,
        outboxEvent: evidence.outboxEvent,
        reconciliation: evidence.reconciliation,
      },
    };
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
        input.anchor.status === 'VERIFIED' &&
        hasRealTransactionMetadata
      ) {
        return {
          status: 'VERIFIED',
          verified: true,
          reviewerSummary:
            'The local hash matches the stored hash and a non-mock Fabric anchor with transaction metadata has been marked verified. Direct chaincode query is not available from this API yet.',
        };
      }

      if (
        input.anchor.anchorType === 'FABRIC' &&
        input.anchor.status === 'ANCHORED' &&
        hasRealTransactionMetadata
      ) {
        return {
          status: 'ANCHORED_NOT_FULLY_VERIFIED',
          verified: false,
          reviewerSummary:
            'A real Fabric anchor with transaction metadata exists, but this API cannot query chaincode yet. Treat this as anchored, not fully verified.',
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
}
