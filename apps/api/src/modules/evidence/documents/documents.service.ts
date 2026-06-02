import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { AuditHashService } from '../../audit/audit-hash.service';
import { PrismaService } from '../../../database/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import { ObjectStorageService } from '../object-storage/object-storage.service';
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

export type UploadDocumentInput = Omit<CreateDocumentInput, 'version'> & {
  fileName: string;
  mimeType?: string;
  contentBase64?: string;
  contentText?: string;
  metadata?: Prisma.InputJsonObject;
};

export type UploadDocumentVersionInput = {
  actorUserId?: string;
  fileName: string;
  mimeType?: string;
  contentBase64?: string;
  contentText?: string;
  metadata?: Prisma.InputJsonObject;
};

export type DocumentVersionDownload = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
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
    private readonly objectStorage: ObjectStorageService,
  ) {}

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.document.findMany({
      where: {
        organizationId,
      },
      include: documentInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

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

  async upload(input: UploadDocumentInput) {
    const document = await this.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      title: input.title,
      documentType: input.documentType,
      description: input.description,
      linkedEntityType: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId,
    });

    await this.createUploadedVersion(document.id, {
      actorUserId: input.actorUserId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      contentBase64: input.contentBase64,
      contentText: input.contentText,
      metadata: input.metadata,
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

  async createUploadedVersion(
    documentId: string,
    input: UploadDocumentVersionInput,
  ) {
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

    const content = contentBufferFromUpload(input);
    const contentHash = createHash('sha256').update(content).digest('hex');
    const versionNumber = (document.versions[0]?.versionNumber || 0) + 1;
    const objectName = [
      'documents',
      document.organizationId,
      document.id,
      `${versionNumber}-${sanitizeObjectName(input.fileName)}`,
    ].join('/');
    const stored = await this.objectStorage.putObject({
      objectName,
      content,
      contentType: input.mimeType,
    });

    return this.createVersion(document.id, {
      actorUserId: input.actorUserId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storageUri: stored.storageUri,
      sizeBytes: stored.sizeBytes,
      contentHash,
      metadata: {
        ...(input.metadata ?? {}),
        objectName: stored.objectName,
        bucket: stored.bucket,
        uploadMode: input.contentBase64 ? 'base64' : 'text',
      },
    });
  }

  async downloadVersion(documentId: string, versionId: string) {
    const version = await this.getVersionForDocument(documentId, versionId);
    const location = parseS3StorageUri(version.storageUri);

    if (!location) {
      throw new BadRequestException(
        'Document version is not backed by object storage',
      );
    }

    const content = await this.objectStorage.getObjectBuffer(
      location.bucket,
      location.objectName,
    );

    return {
      fileName: version.fileName,
      mimeType: version.mimeType || 'application/octet-stream',
      sizeBytes: content.length,
      content,
    } satisfies DocumentVersionDownload;
  }

  async previewVersion(documentId: string, versionId: string) {
    const version = await this.getVersionForDocument(documentId, versionId);
    const download = await this.downloadVersion(documentId, versionId);
    const text = download.content.toString('utf8');

    return {
      documentId,
      versionId,
      fileName: version.fileName,
      mimeType: download.mimeType,
      sizeBytes: download.sizeBytes,
      storageUri: version.storageUri,
      contentHash: version.contentHash,
      previewText: isReviewerPreviewable(download.mimeType)
        ? text
        : text.slice(0, 4000),
    };
  }

  private async getVersionForDocument(documentId: string, versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: true,
      },
    });

    if (!version || version.documentId !== documentId) {
      throw new NotFoundException('Document version not found');
    }

    return version;
  }
}

function contentBufferFromUpload(input: {
  contentBase64?: string;
  contentText?: string;
}) {
  const contentBase64 = optionalText(input.contentBase64);
  const contentText = input.contentText;

  if (contentBase64) {
    return Buffer.from(contentBase64, 'base64');
  }

  if (contentText !== undefined) {
    return Buffer.from(contentText, 'utf8');
  }

  throw new BadRequestException('contentBase64 or contentText is required');
}

function sanitizeObjectName(fileName: string) {
  return requireText(fileName, 'fileName').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parseS3StorageUri(storageUri?: string | null) {
  if (!storageUri?.startsWith('s3://')) {
    return null;
  }

  const withoutScheme = storageUri.slice('s3://'.length);
  const slashIndex = withoutScheme.indexOf('/');

  if (slashIndex <= 0) {
    return null;
  }

  return {
    bucket: withoutScheme.slice(0, slashIndex),
    objectName: withoutScheme.slice(slashIndex + 1),
  };
}

function isReviewerPreviewable(mimeType: string) {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  );
}
