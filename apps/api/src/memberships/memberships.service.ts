import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../database/prisma.service';

export type CreateMembershipInput = {
  organizationId: string;
  userId: string;
  roleId: string;
  status?: string;
  actorUserId?: string;
};

export type ListOrganizationMembershipInput = {
  organizationId: string;
  actorUserId?: string;
};

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateMembershipInput) {
    if (!input.organizationId || !input.userId || !input.roleId) {
      throw new BadRequestException(
        'organizationId, userId, and roleId are required',
      );
    }

    await this.assertOrganizationAdmin(input.organizationId, input.actorUserId);
    await this.assertRoleExists(input.roleId);
    await this.assertAssignableUser({
      organizationId: input.organizationId,
      userId: input.userId,
    });

    const membership = await this.prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      update: {
        roleId: input.roleId,
        status: input.status || 'active',
      },
      create: {
        organizationId: input.organizationId,
        userId: input.userId,
        roleId: input.roleId,
        status: input.status || 'active',
      },
      include: {
        organization: true,
        role: true,
        user: true,
      },
    });

    await this.auditEvents.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'MEMBERSHIP_CREATED',
      entityType: 'Membership',
      entityId: membership.id,
      metadata: {
        userId: membership.userId,
        roleId: membership.roleId,
        roleCode: membership.role.code,
        status: membership.status,
      },
    });

    return membership;
  }

  async listByOrganization(input: ListOrganizationMembershipInput) {
    await this.assertOrganizationAdmin(input.organizationId, input.actorUserId);

    return this.prisma.membership.findMany({
      where: {
        organizationId: input.organizationId,
      },
      include: {
        user: true,
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async assertOrganizationAdmin(
    organizationId: string,
    actorUserId: string | undefined,
  ) {
    if (!actorUserId?.trim()) {
      throw new BadRequestException('actorUserId is required');
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

  private async assertAssignableUser(input: {
    organizationId: string;
    userId: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      include: {
        memberships: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const belongsToOtherOrganization = user.memberships.some(
      (membership) => membership.organizationId !== input.organizationId,
    );

    if (belongsToOtherOrganization) {
      throw new ForbiddenException(
        'Cannot assign roles to users registered under another organization',
      );
    }
  }
}
