import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Permission } from '../identity/rbac.service';
import { getAuthRuntimeConfig } from './auth.config';

export type DevLoginInput = {
  email?: string;
  userId?: string;
  organizationId?: string;
};

export type SessionLookupInput = {
  userId?: string;
  organizationId?: string;
};

export type AuthSession = {
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  roleCodes: string[];
  permissionCodes: Permission[];
  workspaceScopes: string[];
  expiresAt: string;
  authMode: 'dev';
  devAuthEnabled: boolean;
  oidcEnabled: boolean;
};

type KnownRole =
  | 'ORG_ADMIN'
  | 'PROCUREMENT_OFFICER'
  | 'APPROVER'
  | 'FINANCIER_USER'
  | 'SHARIAH_REVIEWER'
  | 'AUDITOR';

const rolePermissionDefaults: Record<KnownRole, Permission[]> = {
  ORG_ADMIN: [
    'users:create',
    'procurement:create',
    'procurement:approve',
    'finance:review',
    'shariah:review',
    'audit:read',
  ],
  PROCUREMENT_OFFICER: ['procurement:create', 'audit:read'],
  APPROVER: ['procurement:approve', 'audit:read'],
  FINANCIER_USER: ['finance:review', 'audit:read'],
  SHARIAH_REVIEWER: ['shariah:review', 'audit:read'],
  AUDITOR: ['audit:read'],
};

const legacyPermissionMap: Record<string, Permission> = {
  USERS_CREATE: 'users:create',
  PROCUREMENT_WRITE: 'procurement:create',
  PROCUREMENT_CREATE: 'procurement:create',
  PROCUREMENT_APPROVE: 'procurement:approve',
  FINANCE_REVIEW: 'finance:review',
  SHARIAH_REVIEW: 'shariah:review',
  AUDIT_READ: 'audit:read',
};

const sessionDurationMs = 8 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async devLogin(input: DevLoginInput) {
    this.assertDevAuthEnabled();

    if (!input.email?.trim() && !input.userId?.trim()) {
      throw new BadRequestException('email or userId is required');
    }

    const user = await this.prisma.user.findFirst({
      where: input.userId
        ? { id: input.userId }
        : { email: input.email?.trim().toLowerCase() },
      include: {
        memberships: {
          where: {
            status: 'active',
            organizationId: input.organizationId || undefined,
          },
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
            organization: {
              include: {
                workspaces: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const membership = user.memberships[0];

    if (!membership) {
      throw new NotFoundException('Active organization membership not found');
    }

    return this.buildSession({
      user,
      organizationId: membership.organizationId,
    });
  }

  async getSession(input: SessionLookupInput) {
    this.assertDevAuthEnabled();

    if (!input.userId?.trim() || !input.organizationId?.trim()) {
      throw new BadRequestException('userId and organizationId are required');
    }

    return this.buildSession({
      userId: input.userId,
      organizationId: input.organizationId,
    });
  }

  private async buildSession(input: {
    user?: Awaited<ReturnType<AuthService['findUserWithMemberships']>>;
    userId?: string;
    organizationId: string;
  }): Promise<AuthSession> {
    const user =
      input.user ??
      (await this.findUserWithMemberships(input.userId, input.organizationId));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeMemberships = user.memberships.filter(
      (membership) =>
        membership.status === 'active' &&
        membership.organizationId === input.organizationId,
    );

    if (!activeMemberships.length) {
      throw new NotFoundException('Active organization membership not found');
    }

    const roleCodes = activeMemberships.map(
      (membership) => membership.role.code,
    );
    const permissionCodes = new Set<Permission>();
    const workspaceScopes = new Set<string>();

    for (const membership of activeMemberships) {
      addRoleDefaultPermissions(membership.role.code, permissionCodes);

      for (const permission of membership.role.permissions) {
        const normalizedPermission = normalizePermissionCode(permission.code);

        if (normalizedPermission) {
          permissionCodes.add(normalizedPermission);
        }
      }

      for (const workspace of membership.organization.workspaces) {
        workspaceScopes.add(workspace.id);
      }
    }

    const authConfig = getAuthRuntimeConfig();

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      organizationId: input.organizationId,
      roleCodes,
      permissionCodes: [...permissionCodes],
      workspaceScopes: [...workspaceScopes],
      expiresAt: new Date(Date.now() + sessionDurationMs).toISOString(),
      authMode: 'dev',
      devAuthEnabled: authConfig.devAuthEnabled,
      oidcEnabled: authConfig.oidcEnabled,
    };
  }

  private assertDevAuthEnabled() {
    if (!getAuthRuntimeConfig().devAuthEnabled) {
      throw new ForbiddenException(
        'Development login is disabled for this environment',
      );
    }
  }

  private findUserWithMemberships(
    userId: string | undefined,
    organizationId: string,
  ) {
    if (!userId) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        memberships: {
          where: {
            organizationId,
          },
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
            organization: {
              include: {
                workspaces: true,
              },
            },
          },
        },
      },
    });
  }
}

function addRoleDefaultPermissions(
  roleCode: string,
  permissionCodes: Set<Permission>,
) {
  const permissions = rolePermissionDefaults[roleCode as KnownRole] ?? [];

  for (const permission of permissions) {
    permissionCodes.add(permission);
  }
}

function normalizePermissionCode(code: string) {
  if (isPermission(code)) {
    return code;
  }

  return legacyPermissionMap[code];
}

function isPermission(code: string): code is Permission {
  return Object.values(rolePermissionDefaults)
    .flat()
    .includes(code as Permission);
}
