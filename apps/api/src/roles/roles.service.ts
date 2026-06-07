import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../database/prisma.service';

export type CreateRoleInput = {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
  actorUserId?: string;
  organizationId?: string;
};

export type ScopedRoleInput = {
  organizationId?: string;
  actorUserId?: string;
};

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateRoleInput) {
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new BadRequestException('code and name are required');
    }

    const scope = await this.assertOrganizationAdmin(input);
    const existing = await this.prisma.role.findUnique({
      where: { code: input.code.trim() },
    });

    if (existing) {
      throw new ConflictException('Role code already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        code: input.code.trim(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        permissions: {
          connectOrCreate: (input.permissionCodes || []).map((code) => ({
            where: { code },
            create: {
              code,
              name: code
                .toLowerCase()
                .split('_')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' '),
            },
          })),
        },
      },
      include: {
        permissions: true,
      },
    });

    await this.auditEvents.create({
      organizationId: scope.organizationId,
      actorUserId: scope.actorUserId,
      eventType: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: role.id,
      metadata: {
        code: role.code,
        name: role.name,
        permissionCodes: role.permissions.map((permission) => permission.code),
      },
    });

    return role;
  }

  async list(input: ScopedRoleInput) {
    await this.assertOrganizationAdmin(input);

    return this.prisma.role.findMany({
      include: {
        permissions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async assertOrganizationAdmin(input: ScopedRoleInput) {
    const organizationId = input.organizationId?.trim();
    const actorUserId = input.actorUserId?.trim();

    if (!organizationId || !actorUserId) {
      throw new BadRequestException(
        'organizationId and actorUserId are required',
      );
    }

    const actorMembership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: actorUserId,
        },
      },
      include: {
        role: true,
      },
    });

    if (
      !actorMembership ||
      actorMembership.status !== 'active' ||
      actorMembership.role.code !== 'ORG_ADMIN'
    ) {
      throw new ForbiddenException('Organization admin membership is required');
    }

    return { organizationId, actorUserId };
  }
}
