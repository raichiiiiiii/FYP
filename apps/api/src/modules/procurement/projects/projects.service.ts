import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  numericValue,
  optionalText,
  requireText,
} from '../procurement.service-utils';

export type CreateProjectInput = {
  organizationId: string;
  actorUserId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: string;
  budget?: number | string;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateProjectInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const name = requireText(input.name, 'name');

    const project = await this.prisma.project.create({
      data: {
        organizationId,
        name,
        code: optionalText(input.code),
        description: optionalText(input.description),
        status: optionalText(input.status) || 'active',
        budget:
          input.budget === undefined
            ? undefined
            : numericValue(input.budget, 'budget'),
      },
    });

    await this.auditEvents.create({
      organizationId: project.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project.id,
      metadata: {
        name: project.name,
        code: project.code,
        budget: project.budget,
      },
    });

    return project;
  }

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.project.findMany({
      where: {
        organizationId,
      },
      include: {
        requisitions: {
          select: {
            id: true,
            title: true,
            status: true,
            totalAmount: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
