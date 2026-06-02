import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../database/prisma.service';

type AdminUserInput = {
  email: string;
  displayName: string;
  passwordHash?: string;
};

const validDeploymentModes = new Set([
  'standalone_sme',
  'financial_entity_node',
  'fabric_organization',
  'hosted_financier_portal',
]);

export type CreateOrganizationInput = {
  legalName: string;
  registrationNumber?: string;
  taxIdentifier?: string;
  shariahProfile?: string;
  deploymentMode?: string;
  adminUser?: AdminUserInput;
};

export type UpdateOrganizationInput = Partial<
  Omit<CreateOrganizationInput, 'adminUser'>
> & {
  actorUserId?: string;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateOrganizationInput) {
    const legalName = input.legalName?.trim();
    const registrationNumber = this.optionalText(input.registrationNumber);
    const deploymentMode = this.normalizeDeploymentMode(input.deploymentMode);

    if (!legalName) {
      throw new BadRequestException('legalName is required');
    }

    await this.assertRegistrationNumberAvailable(registrationNumber);

    if (!input.adminUser) {
      const organization = await this.prisma.organization.create({
        data: {
          legalName,
          registrationNumber,
          taxIdentifier: this.optionalText(input.taxIdentifier),
          shariahProfile: this.optionalText(input.shariahProfile),
          deploymentMode,
        },
      });

      await this.auditEvents.create({
        organizationId: organization.id,
        eventType: 'ORGANIZATION_CREATED',
        entityType: 'Organization',
        entityId: organization.id,
        metadata: {
          legalName: organization.legalName,
          deploymentMode: organization.deploymentMode,
        },
      });

      return { organization };
    }

    const adminUserInput = input.adminUser;

    if (!adminUserInput.email?.trim() || !adminUserInput.displayName?.trim()) {
      throw new BadRequestException(
        'adminUser email and displayName are required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          legalName,
          registrationNumber,
          taxIdentifier: this.optionalText(input.taxIdentifier),
          shariahProfile: this.optionalText(input.shariahProfile),
          deploymentMode,
        },
      });

      const adminUser = await tx.user.upsert({
        where: {
          email: adminUserInput.email,
        },
        update: {
          displayName: adminUserInput.displayName,
          status: 'active',
        },
        create: {
          email: adminUserInput.email,
          displayName: adminUserInput.displayName,
          passwordHash: adminUserInput.passwordHash,
        },
      });

      const adminRole = await tx.role.upsert({
        where: {
          code: 'ORG_ADMIN',
        },
        update: {
          name: 'Organization Admin',
          description: 'Local development administrator for an SME node.',
        },
        create: {
          code: 'ORG_ADMIN',
          name: 'Organization Admin',
          description: 'Local development administrator for an SME node.',
        },
      });

      const membership = await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: adminUser.id,
          },
        },
        update: {
          roleId: adminRole.id,
          status: 'active',
        },
        create: {
          organizationId: organization.id,
          userId: adminUser.id,
          roleId: adminRole.id,
        },
        include: {
          role: true,
          user: true,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: 'General Workspace',
          type: 'general',
        },
      });

      const organizationAudit = await tx.auditEvent.create({
        data: {
          organizationId: organization.id,
          actorUserId: adminUser.id,
          eventType: 'ORGANIZATION_CREATED',
          entityType: 'Organization',
          entityId: organization.id,
          metadata: {
            legalName: organization.legalName,
            deploymentMode: organization.deploymentMode,
          },
        },
      });

      await tx.auditEvent.createMany({
        data: [
          {
            organizationId: organization.id,
            actorUserId: adminUser.id,
            eventType: 'USER_CREATED',
            entityType: 'User',
            entityId: adminUser.id,
            metadata: {
              email: adminUser.email,
              displayName: adminUser.displayName,
            },
          },
          {
            organizationId: organization.id,
            actorUserId: adminUser.id,
            eventType: 'MEMBERSHIP_CREATED',
            entityType: 'Membership',
            entityId: membership.id,
            metadata: {
              roleCode: adminRole.code,
              userId: adminUser.id,
            },
          },
          {
            organizationId: organization.id,
            actorUserId: adminUser.id,
            eventType: 'WORKSPACE_CREATED',
            entityType: 'Workspace',
            entityId: workspace.id,
            metadata: {
              name: workspace.name,
              type: workspace.type,
            },
          },
        ],
      });

      return {
        organization,
        adminUser,
        adminRole,
        membership,
        workspace,
        auditEvent: organizationAudit,
      };
    });
  }

  async getById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            role: true,
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        workspaces: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, input: UpdateOrganizationInput) {
    const deploymentMode = input.deploymentMode
      ? this.normalizeDeploymentMode(input.deploymentMode)
      : undefined;
    const registrationNumber = this.optionalText(input.registrationNumber);

    if (input.legalName !== undefined && !input.legalName.trim()) {
      throw new BadRequestException('legalName is required');
    }

    await this.assertRegistrationNumberAvailable(registrationNumber, id);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        legalName: this.optionalText(input.legalName),
        registrationNumber,
        taxIdentifier: this.optionalText(input.taxIdentifier),
        shariahProfile: this.optionalText(input.shariahProfile),
        deploymentMode,
      },
    });

    await this.auditEvents.create({
      organizationId: organization.id,
      actorUserId: input.actorUserId,
      eventType: 'ORGANIZATION_UPDATED',
      entityType: 'Organization',
      entityId: organization.id,
      metadata: {
        legalName: organization.legalName,
        deploymentMode: organization.deploymentMode,
      },
    });

    return organization;
  }

  private normalizeDeploymentMode(value: string | undefined) {
    const deploymentMode = this.optionalText(value) || 'standalone_sme';

    if (!validDeploymentModes.has(deploymentMode)) {
      throw new BadRequestException('deploymentMode must be valid');
    }

    return deploymentMode;
  }

  private optionalText(value: string | undefined) {
    const text = value?.trim();
    return text || undefined;
  }

  private async assertRegistrationNumberAvailable(
    registrationNumber: string | undefined,
    currentOrganizationId?: string,
  ) {
    if (!registrationNumber) {
      return;
    }

    const existing = await this.prisma.organization.findFirst({
      where: {
        registrationNumber,
      },
      select: {
        id: true,
      },
    });

    if (existing && existing.id !== currentOrganizationId) {
      throw new BadRequestException('registrationNumber already exists');
    }
  }
}
