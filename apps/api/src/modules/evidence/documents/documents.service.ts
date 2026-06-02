import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { AuditHashService } from '../../audit/audit-hash.service';
import { PrismaService } from '../../../database/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import {
  optionalPositiveInt,
  optionalText,
  requireText,
} from '../evidence.service-utils';

export type CreateDocumentVersionInput = {
  actorUserId?: string;
  fileName: string;
  mimeType?: string;
  storageUri?: string;
  sizeBytes?: number | string;
  contentHash?: string;
  canonicalContent?: unknown;
  metadata?: Prisma.InputJsonObject;
};

export type CreateDocumentInput = {
  organizationId: string;
  actorUserId?: string;
  title: string;
  documentType: string;
  description?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  version?: CreateDocumentVersionInput;
};

const documentInclude = {
  versions: {
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      versionNumber: 'desc',
    },
  },
  evidenceItems: {
    orderBy: {
      createdAt: 'desc',
    },
  },
} satisfies Prisma.DocumentInclude;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
    private readonly auditHash: AuditHashService,
    private readonly outbox: OutboxService,
  ) {}

  async create(input: CreateDocumentInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');

    const document = await this.prisma.document.create({
      data: {
        organizationId,
        title: requireText(input.title, 'title'),
        documentType: requireText(input.documentType, 'documentType'),
        description: optionalText(input.description),
        linkedEntityType: optionalText(input.linkedEntityType),
        linkedEntityId: optionalText(input.linkedEntityId),
      },
    });

    if (input.version) {
      await this.createVersion(document.id, {
        ...input.version,
        actorUserId: input.version.actorUserId || input.actorUserId,
      });
    }

    await this.auditEvents.create({
      organizationId: document.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'DOCUMENT_REGISTERED',
      entityType: 'Document',
      entityId: document.id,
      metadata: {
        title: document.title,
        documentType: document.documentType,
        linkedEntityType: document.linkedEntityType,
        linkedEntityId: document.linkedEntityId,
      },
    });

    await this.outbox.create({
      organizationId: document.organizationId,
      eventType: 'DOCUMENT_REGISTERED',
      aggregateType: 'Document',
      aggregateId: document.id,
      payload: {
        documentId: document.id,
        documentType: document.documentType,
      },
    });

    return this.getById(document.id);
  }

  async getById(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: documentInclude,
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async createVersion(documentId: string, input: CreateDocumentVersionInput) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          select: {
            versionNumber: true,
          },
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const contentHash =
      optionalText(input.contentHash) ||
      (input.canonicalContent
        ? this.auditHash.hashCanonicalJson(input.canonicalContent).canonicalHash
        : undefined);

    if (!contentHash && !optionalText(input.storageUri)) {
      throw new BadRequestException(
        'Either contentHash, canonicalContent, or storageUri is required',
      );
    }

    const versionNumber = (document.versions[0]?.versionNumber || 0) + 1;

    const version = await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber,
        fileName: requireText(input.fileName, 'fileName'),
        mimeType: optionalText(input.mimeType),
        storageUri: optionalText(input.storageUri),
        sizeBytes: optionalPositiveInt(input.sizeBytes, 'sizeBytes'),
        contentHash,
        metadata: input.metadata,
        createdByUserId: optionalText(input.actorUserId),
      },
      include: {
        document: true,
      },
    });

    await this.auditEvents.create({
      organizationId: document.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'DOCUMENT_VERSION_CREATED',
      entityType: 'DocumentVersion',
      entityId: version.id,
      metadata: {
        documentId: document.id,
        versionNumber: version.versionNumber,
        fileName: version.fileName,
        contentHash: version.contentHash,
      },
    });

    await this.outbox.create({
      organizationId: document.organizationId,
      eventType: 'DOCUMENT_VERSION_CREATED',
      aggregateType: 'DocumentVersion',
      aggregateId: version.id,
      payload: {
        documentId: document.id,
        versionId: version.id,
        versionNumber: version.versionNumber,
      },
    });

    return version;
  }
}
