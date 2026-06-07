import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { PrismaService } from '../../database/prisma.service';

type ActorMembership = {
  organizationId: string;
  userId: string;
  role: {
    code: string;
  };
};

export type UserNavigationOverrideLookup = {
  organizationId?: string;
  actorUserId?: string;
  userId?: string;
};

export type NavigationOverrideInput = {
  routePath?: string;
  visible?: boolean;
};

export type UpdateNavigationOverridesInput = UserNavigationOverrideLookup & {
  overrides?: NavigationOverrideInput[];
};

@Injectable()
export class NavigationOverridesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async getForUser(input: UserNavigationOverrideLookup) {
    const actor = await this.assertActiveMembership(input);
    const targetUserId = this.requiredUserId(input.userId);
    await this.assertTargetUserInOrganization(
      actor.organizationId,
      targetUserId,
    );

    if (actor.userId !== targetUserId && actor.role.code !== 'ORG_ADMIN') {
      throw new ForbiddenException(
        'Only organization admins may inspect another user navigation overrides',
      );
    }

    const overrides = await this.prisma.userNavigationOverride.findMany({
      where: {
        organizationId: actor.organizationId,
        userId: targetUserId,
      },
      orderBy: {
        routePath: 'asc',
      },
    });

    return {
      organizationId: actor.organizationId,
      userId: targetUserId,
      overrides: overrides.map((override) => ({
        routePath: override.routePath,
        visible: override.visible,
      })),
    };
  }

  async updateForUser(input: UpdateNavigationOverridesInput) {
    const actor = await this.assertActiveMembership(input);
    const targetUserId = this.requiredUserId(input.userId);

    if (actor.role.code !== 'ORG_ADMIN') {
      throw new ForbiddenException('Organization admin membership is required');
    }

    await this.assertTargetUserInOrganization(
      actor.organizationId,
      targetUserId,
    );
    const overrides = normalizeOverrides(input.overrides);

    await this.prisma.$transaction(async (tx) => {
      await tx.userNavigationOverride.deleteMany({
        where: {
          organizationId: actor.organizationId,
          userId: targetUserId,
        },
      });

      if (overrides.length) {
        await tx.userNavigationOverride.createMany({
          data: overrides.map((override) => ({
            organizationId: actor.organizationId,
            userId: targetUserId,
            routePath: override.routePath,
            visible: override.visible,
            setByUserId: actor.userId,
          })),
        });
      }
    });

    await this.auditEvents.create({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventType: 'USER_NAVIGATION_OVERRIDES_UPDATED',
      entityType: 'User',
      entityId: targetUserId,
      metadata: {
        overrideCount: overrides.length,
        hiddenRouteCount: overrides.filter((override) => !override.visible)
          .length,
        visibleRouteCount: overrides.filter((override) => override.visible)
          .length,
      },
    });

    return this.getForUser({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      userId: targetUserId,
    });
  }

  private async assertActiveMembership(
    input: UserNavigationOverrideLookup,
  ): Promise<ActorMembership> {
    const organizationId = input.organizationId?.trim();
    const actorUserId = input.actorUserId?.trim();

    if (!organizationId || !actorUserId) {
      throw new BadRequestException(
        'organizationId and actorUserId are required',
      );
    }

    const membership = await this.prisma.membership.findUnique({
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

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException(
        'Active organization membership is required',
      );
    }

    return {
      organizationId: membership.organizationId,
      userId: membership.userId,
      role: {
        code: membership.role.code,
      },
    };
  }

  private async assertTargetUserInOrganization(
    organizationId: string,
    userId: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'User is not registered under this organization',
      );
    }
  }

  private requiredUserId(userId: string | undefined) {
    const normalized = userId?.trim();

    if (!normalized) {
      throw new BadRequestException('userId is required');
    }

    return normalized;
  }
}

function normalizeOverrides(input: NavigationOverrideInput[] | undefined) {
  const unique = new Map<string, { routePath: string; visible: boolean }>();

  for (const override of input ?? []) {
    const routePath = override.routePath?.trim();

    if (!routePath || !routePath.startsWith('/') || routePath.length > 160) {
      throw new BadRequestException(
        'override routePath must be an application route path',
      );
    }

    if (typeof override.visible !== 'boolean') {
      throw new BadRequestException('override visible must be boolean');
    }

    unique.set(routePath, {
      routePath,
      visible: override.visible,
    });
  }

  return [...unique.values()];
}
