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
  profileImageUrl: string | null;
  organizationId: string;
  organization: {
    id: string;
    legalName: string;
    deploymentMode: string;
  };
  roleCodes: string[];
  permissionCodes: Permission[];
  workspaceScopes: string[];
  expiresAt: string;
  authMode: 'dev' | 'oidc';
  devAuthEnabled: boolean;
  oidcEnabled: boolean;
};

export type AuthPublicConfig = {
  devAuthEnabled: boolean;
  oidcEnabled: boolean;
  oidcTestMode: boolean;
};

type KnownRole =
  | 'ORG_ADMIN'
  | 'PROCUREMENT_OFFICER'
  | 'APPROVER'
  | 'FINANCIER_USER'
  | 'SHARIAH_REVIEWER'
  | 'AUDITOR'
  | 'FABRIC_GOVERNANCE_ADMIN'
  | 'PLATFORM_OPERATOR';

const rolePermissionDefaults: Record<KnownRole, Permission[]> = {
  ORG_ADMIN: [
    'users:create',
    'procurement:create',
    'procurement:approve',
    'finance:review',
    'shariah:review',
    'audit:read',
    'fabric:governance',
  ],
  PROCUREMENT_OFFICER: ['procurement:create', 'audit:read'],
  APPROVER: ['procurement:approve', 'audit:read'],
  FINANCIER_USER: ['finance:review', 'audit:read'],
  SHARIAH_REVIEWER: ['shariah:review', 'audit:read'],
  AUDITOR: ['audit:read'],
  FABRIC_GOVERNANCE_ADMIN: ['audit:read', 'fabric:governance'],
  PLATFORM_OPERATOR: ['audit:read', 'fabric:operate'],
};

const legacyPermissionMap: Record<string, Permission> = {
  USERS_CREATE: 'users:create',
  PROCUREMENT_WRITE: 'procurement:create',
  PROCUREMENT_CREATE: 'procurement:create',
  PROCUREMENT_APPROVE: 'procurement:approve',
  FINANCE_REVIEW: 'finance:review',
  SHARIAH_REVIEW: 'shariah:review',
  AUDIT_READ: 'audit:read',
  FABRIC_GOVERNANCE: 'fabric:governance',
  FABRIC_OPERATE: 'fabric:operate',
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

  getPublicConfig(): AuthPublicConfig {
    const config = getAuthRuntimeConfig();

    return {
      devAuthEnabled: config.devAuthEnabled,
      oidcEnabled: config.oidcEnabled,
      oidcTestMode: config.oidcTestMode,
    };
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

  async oidcLogin(input: { email: string; organizationId?: string }) {
    const email = input.email.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException('email is required');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
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
      throw new NotFoundException('OIDC user is not provisioned');
    }

    const membership = user.memberships[0];

    if (!membership) {
      throw new NotFoundException('Active organization membership not found');
    }

    return this.buildSession({
      user,
      organizationId: membership.organizationId,
      authMode: 'oidc',
    });
  }

  private async buildSession(input: {
    user?: Awaited<ReturnType<AuthService['findUserWithMemberships']>>;
    userId?: string;
    organizationId: string;
    authMode?: AuthSession['authMode'];
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
    const organization = activeMemberships[0].organization;
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
      profileImageUrl: user.profileImageUrl,
      organizationId: input.organizationId,
      organization: {
        id: organization.id,
        legalName: organization.legalName,
        deploymentMode: organization.deploymentMode,
      },
      roleCodes,
      permissionCodes: [...permissionCodes],
      workspaceScopes: [...workspaceScopes],
      expiresAt: new Date(Date.now() + sessionDurationMs).toISOString(),
      authMode: input.authMode ?? 'dev',
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
