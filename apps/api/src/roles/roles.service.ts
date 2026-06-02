import {
  BadRequestException,
  ConflictException,
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

    const existing = await this.prisma.role.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new ConflictException('Role code already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
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
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
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

  list() {
    return this.prisma.role.findMany({
      include: {
        permissions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
