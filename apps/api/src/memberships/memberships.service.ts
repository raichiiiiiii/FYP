import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../database/prisma.service';

export type CreateMembershipInput = {
  organizationId: string;
  userId: string;
  roleId: string;
  status?: string;
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

  listByOrganization(orgId: string) {
    return this.prisma.membership.findMany({
      where: {
        organizationId: orgId,
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
}
