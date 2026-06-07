import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { PrismaService } from '../../database/prisma.service';
import { getAuthRuntimeConfig } from '../auth/auth.config';
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

export type UpdateAccountPasswordInput = AccountProfileLookup & {
  currentPassword?: string;
  newPassword?: string;
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

  async updatePassword(input: UpdateAccountPasswordInput) {
    const membership = await this.assertActiveMembership(input);

    if (!getAuthRuntimeConfig().passwordAuthEnabled) {
      throw new ForbiddenException(
        'Local password update is disabled for this environment',
      );
    }

    const currentPassword = input.currentPassword ?? '';
    const newPassword = input.newPassword ?? '';

    if (!currentPassword || !newPassword) {
      throw new BadRequestException(
        'currentPassword and newPassword are required',
      );
    }

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'newPassword must be at least 8 characters',
      );
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'newPassword must be different from currentPassword',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: membership.userId,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!verifyPasswordHash(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Current password is invalid');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: hashPassword(newPassword),
      },
    });

    await this.auditEvents.create({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      eventType: 'ACCOUNT_PASSWORD_UPDATED',
      entityType: 'User',
      entityId: membership.userId,
      metadata: {
        localUatCredentialBoundary: true,
      },
    });

    return {
      updated: true,
      userId: user.id,
      organizationId: membership.organizationId,
    };
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

function hashPassword(password: string) {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}

function verifyPasswordHash(password: string, storedHash: string | null) {
  if (!storedHash?.startsWith('sha256:')) {
    return false;
  }

  const expectedHex = storedHash.slice('sha256:'.length);
  const actualHex = createHash('sha256').update(password).digest('hex');
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');

  if (expected.length !== actual.length || expected.length === 0) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
