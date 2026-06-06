import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Invitation, Prisma } from '@prisma/client';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  calculateInvitationExpiry,
  createInvitationToken,
  hashInvitationToken,
  resolveInvitationStatus,
} from './invitation-token';

export type CreateInvitationInput = {
  organizationId: string;
  actorUserId: string;
  email: string;
  roleCode: string;
  workspaceId?: string;
  expiresAt?: string;
};

export type ListInvitationsInput = {
  organizationId?: string;
  actorUserId?: string;
};

export type RevokeInvitationInput = {
  actorUserId: string;
};

export type AcceptInvitationInput = {
  token: string;
  displayName?: string;
};

type InvitationWithRelations = Invitation & {
  organization?: { id: string; legalName: string } | null;
  workspace?: { id: string; name: string } | null;
  invitedBy?: { id: string; email: string; displayName: string } | null;
  acceptedBy?: { id: string; email: string; displayName: string } | null;
};

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateInvitationInput) {
    const organizationId = required(input.organizationId, 'organizationId');
    const actorUserId = required(input.actorUserId, 'actorUserId');
    const email = normalizeEmail(input.email);
    const roleCode = required(input.roleCode, 'roleCode');

    await this.assertCanManageInvitations(organizationId, actorUserId);
    await this.assertRoleExists(roleCode);
    await this.assertWorkspaceBelongsToOrganization(
      input.workspaceId,
      organizationId,
    );

    const token = createInvitationToken();
    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || undefined,
        email,
        roleCode,
        tokenHash: hashInvitationToken(token),
        expiresAt: input.expiresAt
          ? parseFutureDate(input.expiresAt, 'expiresAt')
          : calculateInvitationExpiry(),
        invitedById: actorUserId,
      },
      include: invitationInclude,
    });

    await this.auditEvents.create({
      organizationId,
      actorUserId,
      eventType: 'INVITATION_CREATED',
      entityType: 'Invitation',
      entityId: invitation.id,
      metadata: {
        email,
        roleCode,
        workspaceId: invitation.workspaceId,
        expiresAt: invitation.expiresAt?.toISOString(),
      },
    });

    return {
      invitation: toInvitationDto(invitation),
      token,
    };
  }

  async list(input: ListInvitationsInput) {
    const organizationId = required(input.organizationId, 'organizationId');
    const actorUserId = required(input.actorUserId, 'actorUserId');

    await this.assertCanManageInvitations(organizationId, actorUserId);

    const invitations = await this.prisma.invitation.findMany({
      where: {
        organizationId,
      },
      include: invitationInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations.map(toInvitationDto);
  }

  async revoke(id: string, input: RevokeInvitationInput) {
    const invitation = await this.findInvitationById(id);
    const actorUserId = required(input.actorUserId, 'actorUserId');

    await this.assertCanManageInvitations(
      invitation.organizationId,
      actorUserId,
    );

    const status = resolveInvitationStatus(invitation);

    if (status === 'accepted') {
      throw new ConflictException('Accepted invitations cannot be revoked');
    }

    if (status === 'revoked') {
      return toInvitationDto(invitation);
    }

    const revoked = await this.prisma.invitation.update({
      where: {
        id,
      },
      data: {
        status: 'revoked',
      },
      include: invitationInclude,
    });

    await this.auditEvents.create({
      organizationId: revoked.organizationId,
      actorUserId,
      eventType: 'INVITATION_REVOKED',
      entityType: 'Invitation',
      entityId: revoked.id,
      metadata: {
        email: revoked.email,
        roleCode: revoked.roleCode,
      },
    });

    return toInvitationDto(revoked);
  }

  async getAcceptanceByToken(token: string) {
    const invitation = await this.findInvitationByToken(token);
    const materialized = await this.materializeExpiredStatus(invitation);

    return toInvitationDto(materialized);
  }

  async accept(input: AcceptInvitationInput) {
    const invitation = await this.findInvitationByToken(input.token);
    const materialized = await this.materializeExpiredStatus(invitation);
    const status = resolveInvitationStatus(materialized);

    if (status === 'expired') {
      throw new BadRequestException('Invitation is expired');
    }

    if (status === 'revoked') {
      throw new ConflictException('Invitation is revoked');
    }

    if (status === 'accepted') {
      throw new ConflictException('Invitation has already been accepted');
    }

    if (!materialized.roleCode) {
      throw new BadRequestException('Invitation roleCode is required');
    }

    const role = await this.assertRoleExists(materialized.roleCode);
    const displayName =
      input.displayName?.trim() || displayNameFromEmail(materialized.email);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: {
          email: materialized.email,
        },
        update: {
          displayName,
          status: 'active',
        },
        create: {
          email: materialized.email,
          displayName,
          status: 'active',
        },
      });

      const membership = await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: materialized.organizationId,
            userId: user.id,
          },
        },
        update: {
          roleId: role.id,
          status: 'active',
        },
        create: {
          organizationId: materialized.organizationId,
          userId: user.id,
          roleId: role.id,
          status: 'active',
        },
        include: {
          role: true,
          user: true,
        },
      });

      const acceptedInvitation = await tx.invitation.update({
        where: {
          id: materialized.id,
        },
        data: {
          status: 'accepted',
          acceptedById: user.id,
          acceptedAt: new Date(),
        },
        include: invitationInclude,
      });

      await tx.auditEvent.createMany({
        data: [
          {
            organizationId: materialized.organizationId,
            actorUserId: user.id,
            eventType: 'INVITATION_ACCEPTED',
            entityType: 'Invitation',
            entityId: materialized.id,
            metadata: {
              email: materialized.email,
              roleCode: materialized.roleCode,
            },
          },
          {
            organizationId: materialized.organizationId,
            actorUserId: user.id,
            eventType: 'MEMBERSHIP_CREATED',
            entityType: 'Membership',
            entityId: membership.id,
            metadata: {
              userId: user.id,
              roleId: role.id,
              roleCode: role.code,
              source: 'invitation',
            },
          },
        ],
      });

      return {
        invitation: acceptedInvitation,
        user,
        membership,
      };
    });

    return {
      invitation: toInvitationDto(result.invitation),
      user: result.user,
      membership: result.membership,
    };
  }

  private async findInvitationById(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        id,
      },
      include: invitationInclude,
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  private async findInvitationByToken(token: string) {
    const tokenHash = hashInvitationToken(token);
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        tokenHash,
      },
      include: invitationInclude,
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  private async materializeExpiredStatus(invitation: InvitationWithRelations) {
    const status = resolveInvitationStatus(invitation);

    if (status !== 'expired' || invitation.status === 'expired') {
      return invitation;
    }

    return this.prisma.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: 'expired',
      },
      include: invitationInclude,
    });
  }

  private async assertCanManageInvitations(
    organizationId: string,
    actorUserId: string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId: actorUserId,
        status: 'active',
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Active organization membership required');
    }

    const permissionCodes = new Set(
      membership.role.permissions.map((permission) => permission.code),
    );

    if (
      membership.role.code !== 'ORG_ADMIN' &&
      !permissionCodes.has('users:create') &&
      !permissionCodes.has('USERS_CREATE')
    ) {
      throw new ForbiddenException('User invitation permission required');
    }
  }

  private async assertRoleExists(roleCode: string) {
    const role = await this.prisma.role.findUnique({
      where: {
        code: roleCode,
      },
    });

    if (!role) {
      throw new BadRequestException(`Role does not exist: ${roleCode}`);
    }

    return role;
  }

  private async assertWorkspaceBelongsToOrganization(
    workspaceId: string | undefined,
    organizationId: string,
  ) {
    if (!workspaceId) {
      return;
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId,
      },
    });

    if (!workspace) {
      throw new BadRequestException(
        'workspaceId must belong to the invitation organization',
      );
    }
  }
}

const invitationInclude = {
  organization: {
    select: {
      id: true,
      legalName: true,
    },
  },
  workspace: {
    select: {
      id: true,
      name: true,
    },
  },
  invitedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
  acceptedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
} satisfies Prisma.InvitationInclude;

function toInvitationDto(invitation: InvitationWithRelations) {
  const safeInvitation: Omit<InvitationWithRelations, 'tokenHash'> & {
    tokenHash?: string;
  } = { ...invitation };
  delete safeInvitation.tokenHash;

  return {
    ...safeInvitation,
    resolvedStatus: resolveInvitationStatus(invitation),
  };
}

function required(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new BadRequestException(`${field} is required`);
  }

  return value.trim();
}

function normalizeEmail(email: string | undefined) {
  const normalized = required(email, 'email').toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new BadRequestException('email must be valid');
  }

  return normalized;
}

function parseFutureDate(value: string, field: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }

  if (parsed.getTime() <= Date.now()) {
    throw new BadRequestException(`${field} must be in the future`);
  }

  return parsed;
}

function displayNameFromEmail(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
