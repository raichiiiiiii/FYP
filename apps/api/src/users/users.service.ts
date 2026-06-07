import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../database/prisma.service';

export type CreateUserInput = {
  email: string;
  displayName: string;
  passwordHash?: string;
  status?: string;
  organizationId?: string;
  actorUserId?: string;
  roleId?: string;
};

export type ScopedIdentityInput = {
  organizationId?: string;
  actorUserId?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateUserInput) {
    if (!input.email?.trim() || !input.displayName?.trim()) {
      throw new BadRequestException('email and displayName are required');
    }

    const scope = await this.assertOrganizationAdmin(input);
    const roleId = input.roleId?.trim();

    if (roleId) {
      await this.assertRoleExists(roleId);
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('User email already exists');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          displayName: input.displayName.trim(),
          passwordHash: input.passwordHash,
          status: input.status || 'active',
        },
      });

      if (roleId) {
        await tx.membership.create({
          data: {
            organizationId: scope.organizationId,
            userId: createdUser.id,
            roleId,
            status: 'active',
          },
        });
      }

      return createdUser;
    });

    await this.auditEvents.create({
      organizationId: scope.organizationId,
      actorUserId: scope.actorUserId,
      eventType: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        displayName: user.displayName,
      },
    });

    return user;
  }

  async list(input: ScopedIdentityInput) {
    const scope = await this.assertOrganizationAdmin(input);

    return this.prisma.user.findMany({
      where: {
        memberships: {
          some: {
            organizationId: scope.organizationId,
          },
        },
      },
      include: {
        memberships: {
          where: {
            organizationId: scope.organizationId,
          },
          include: {
            organization: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getById(id: string, input: ScopedIdentityInput) {
    const scope = await this.assertOrganizationAdmin(input);
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: {
            organizationId: scope.organizationId,
          },
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.memberships.length) {
      throw new ForbiddenException(
        'User is not registered under this organization',
      );
    }

    return user;
  }

  private async assertOrganizationAdmin(input: ScopedIdentityInput) {
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

  private async assertRoleExists(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }
  }
}
