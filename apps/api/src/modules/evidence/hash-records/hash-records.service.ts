import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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
