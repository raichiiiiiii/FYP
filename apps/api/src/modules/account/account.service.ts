import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { PrismaService } from '../../database/prisma.service';
import {
  validateDisplayName,
  validateProfileImageUrl,
} from './account-profile.contract';

export type AccountProfileLookup = {
  organizationId?: string;
  actorUserId?: string;
};

export type UpdateAccountProfileInput = AccountProfileLookup & {
  displayName?: string;
  profileImageUrl?: string | null;
};

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async getProfile(input: AccountProfileLookup) {
    const membership = await this.assertActiveMembership(input);

    return this.toProfileDto(membership.userId, input.organizationId ?? '');
  }

  async updateProfile(input: UpdateAccountProfileInput) {
    const membership = await this.assertActiveMembership(input);
    const updates: {
      displayName?: string;
      profileImageUrl?: string | null;
    } = {};

    if (input.displayName !== undefined) {
      updates.displayName = validateDisplayName(input.displayName);
    }

    if (input.profileImageUrl !== undefined) {
      updates.profileImageUrl = validateProfileImageUrl(input.profileImageUrl);
    }

    if (!Object.keys(updates).length) {
      throw new BadRequestException(
        'displayName or profileImageUrl is required',
      );
    }

    await this.prisma.user.update({
      where: {
        id: membership.userId,
      },
      data: updates,
    });

    await this.auditEvents.create({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      eventType: 'ACCOUNT_PROFILE_UPDATED',
      entityType: 'User',
      entityId: membership.userId,
      metadata: {
        changedFields: Object.keys(updates),
      },
    });

    return this.toProfileDto(membership.userId, membership.organizationId);
  }

  private async assertActiveMembership(input: AccountProfileLookup) {
    if (!input.organizationId?.trim() || !input.actorUserId?.trim()) {
      throw new BadRequestException(
        'organizationId and actorUserId are required',
      );
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.actorUserId,
        },
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException(
        'Active organization membership is required',
      );
    }

    return membership;
  }

  private async toProfileDto(userId: string, organizationId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        memberships: {
          where: {
            organizationId,
          },
          include: {
            organization: true,
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleCodes = user.memberships.map(
      (membership) => membership.role.code,
    );
    const permissionCodes = [
      ...new Set(
        user.memberships.flatMap((membership) =>
          membership.role.permissions.map((permission) => permission.code),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      profileImageUrl: user.profileImageUrl,
      status: user.status,
      organizationId,
      roleCodes,
      permissionCodes,
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        organizationId: membership.organizationId,
        status: membership.status,
        role: {
          id: membership.role.id,
          code: membership.role.code,
          name: membership.role.name,
          permissions: membership.role.permissions.map((permission) => ({
            id: permission.id,
            code: permission.code,
            name: permission.name,
          })),
        },
        organization: {
          id: membership.organization.id,
          legalName: membership.organization.legalName,
        },
      })),
    };
  }
}
