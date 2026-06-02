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
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
};

export type SearchAuditEventsFilter = ListAuditEventsFilter & {
  page?: string | number;
  pageSize?: string | number;
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
      where: auditWhere(filter),
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

  async search(filter: SearchAuditEventsFilter = {}) {
    const page = positiveInt(filter.page, 1);
    const pageSize = Math.min(positiveInt(filter.pageSize, 25), 100);
    const where = auditWhere(filter);
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
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

function auditWhere(
  filter: ListAuditEventsFilter,
): Prisma.AuditEventWhereInput {
  const where: Prisma.AuditEventWhereInput = {};
  const range = dateRange(filter.from, filter.to);

  if (filter.organizationId) where.organizationId = filter.organizationId;
  if (filter.eventType) where.eventType = filter.eventType;
  if (filter.actorUserId) where.actorUserId = filter.actorUserId;
  if (filter.entityType) where.entityType = filter.entityType;
  if (filter.entityId) where.entityId = filter.entityId;
  if (range) where.createdAt = range;

  return where;
}

function dateRange(from?: string, to?: string) {
  const gte = parseDate(from);
  const lte = parseDate(to);

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

function parseDate(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date filter: ${value}`);
  }

  return parsed;
}

function positiveInt(value: string | number | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}
