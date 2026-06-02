import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type CreateAuditEventInput = {
  organizationId?: string;
  actorUserId?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  metadata?: Prisma.InputJsonObject;
};

export type ListAuditEventsFilter = {
  organizationId?: string;
  eventType?: string;
};

export type ListEntityAuditEventsFilter = {
  entityType: string;
  entityId: string;
  organizationId?: string;
};

@Injectable()
export class AuditEventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAuditEventInput) {
    if (!input.eventType?.trim()) {
      throw new BadRequestException('eventType is required');
    }

    if (!input.entityType?.trim() || !input.entityId?.trim()) {
      throw new BadRequestException('entityType and entityId are required');
    }

    return this.prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        correlationId: input.correlationId,
        metadata: input.metadata,
      },
    });
  }

  list(filter: ListAuditEventsFilter = {}) {
    return this.prisma.auditEvent.findMany({
      where: {
        organizationId: filter.organizationId,
        eventType: filter.eventType,
      },
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        organization: {
          select: {
            id: true,
            legalName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  listByEntity(filter: ListEntityAuditEventsFilter) {
    return this.prisma.auditEvent.findMany({
      where: {
        organizationId: filter.organizationId,
        entityType: filter.entityType,
        entityId: filter.entityId,
      },
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        organization: {
          select: {
            id: true,
            legalName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 200,
    });
  }
}
