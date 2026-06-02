import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import { optionalText, requireText } from '../evidence.service-utils';

export type CreateEvidenceItemInput = {
  organizationId: string;
  actorUserId?: string;
  evidencePackId?: string;
  documentId?: string;
  documentVersionId?: string;
  entityType: string;
  entityId: string;
  label?: string;
  evidenceType?: string;
  metadata?: Prisma.InputJsonObject;
};

export type ListEvidenceItemsFilter = {
  organizationId?: string;
  entityType?: string;
  entityId?: string;
  evidencePackId?: string;
};

const evidenceItemInclude = {
  evidencePack: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
  document: true,
  documentVersion: true,
} satisfies Prisma.EvidenceItemInclude;

@Injectable()
export class EvidenceItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
    private readonly outbox: OutboxService,
  ) {}

  async create(input: CreateEvidenceItemInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const entityType = requireText(input.entityType, 'entityType');
    const entityId = requireText(input.entityId, 'entityId');

    await this.assertSameOrganization(organizationId, input);

    const item = await this.prisma.evidenceItem.create({
      data: {
        organizationId,
        evidencePackId: optionalText(input.evidencePackId),
        documentId: optionalText(input.documentId),
        documentVersionId: optionalText(input.documentVersionId),
        entityType,
        entityId,
        label: optionalText(input.label) || `${entityType} evidence`,
        evidenceType: optionalText(input.evidenceType) || 'PROCUREMENT_RECORD',
        metadata: input.metadata,
      },
      include: evidenceItemInclude,
    });

    await this.auditEvents.create({
      organizationId: item.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'EVIDENCE_ITEM_LINKED',
      entityType: 'EvidenceItem',
      entityId: item.id,
      metadata: {
        linkedEntityType: item.entityType,
        linkedEntityId: item.entityId,
        evidencePackId: item.evidencePackId,
        documentId: item.documentId,
        documentVersionId: item.documentVersionId,
      },
    });

    await this.outbox.create({
      organizationId: item.organizationId,
      eventType: 'EVIDENCE_ITEM_LINKED',
      aggregateType: 'EvidenceItem',
      aggregateId: item.id,
      payload: {
        evidenceItemId: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
      },
    });

    return item;
  }

  list(filter: ListEvidenceItemsFilter = {}) {
    if (!filter.organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.evidenceItem.findMany({
      where: {
        organizationId: filter.organizationId,
        entityType: filter.entityType,
        entityId: filter.entityId,
        evidencePackId: filter.evidencePackId,
      },
      include: evidenceItemInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async assertSameOrganization(
    organizationId: string,
    input: CreateEvidenceItemInput,
  ) {
    if (input.evidencePackId) {
      const pack = await this.prisma.evidencePack.findUnique({
        where: { id: input.evidencePackId },
      });

      if (!pack) {
        throw new NotFoundException('Evidence pack not found');
      }

      if (pack.organizationId !== organizationId) {
        throw new BadRequestException(
          'Evidence pack does not belong to the organization',
        );
      }
    }

    if (input.documentId) {
      const document = await this.prisma.document.findUnique({
        where: { id: input.documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      if (document.organizationId !== organizationId) {
        throw new BadRequestException(
          'Document does not belong to the organization',
        );
      }
    }

    if (input.documentVersionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: input.documentVersionId },
        include: { document: true },
      });

      if (!version) {
        throw new NotFoundException('Document version not found');
      }

      if (version.document.organizationId !== organizationId) {
        throw new BadRequestException(
          'Document version does not belong to the organization',
        );
      }
    }
  }
}
