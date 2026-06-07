import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  FabricChannel,
  FabricChannelInvitation,
  FabricChannelMembership,
  FabricChannelProposal,
  FabricGovernanceApproval,
  FabricGovernanceEvidence,
  FabricNetwork,
  Prisma,
} from '@prisma/client';
import {
  missingFabricGatewayConfig,
  readFabricEnv,
} from '../../../config/fabric-env';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  assertSanitizedFabricGovernanceEvidence,
  fabricGovernanceReadRoles,
  fabricGovernanceRoles,
  normalizeEvidenceType,
  normalizeProposalType,
  type FabricChannelDto,
  type FabricChannelInvitationDto,
  type FabricChannelMembershipDto,
  type FabricChannelProposalDto,
  type FabricGovernanceActor,
  type FabricGovernanceApprovalDto,
  type FabricGovernanceEvidenceDto,
  type FabricNetworkDto,
} from './fabric-governance.dto';
import { getFabricUatBlockerDecisionResponse } from './fabric-uat-blocker-decisions';
import { getFabricTopologyAutomationReadiness } from './fabric-topology-automation-readiness';

type CreateNetworkInput = {
  organizationId?: string;
  actorUserId?: string;
  name?: string;
  environment?: string;
  operatorOrganizationId?: string;
};

type CreateChannelInput = {
  organizationId?: string;
  actorUserId?: string;
  fabricNetworkId?: string;
  networkName?: string;
  networkEnvironment?: string;
  channelName?: string;
  chaincodeName?: string;
  mspId?: string;
  invitedOrganizationId?: string;
  invitedEmail?: string;
  invitedMspId?: string;
};

type ListScopedInput = {
  organizationId?: string;
  actorUserId?: string;
};

type ChannelScopedInput = ListScopedInput & {
  fabricChannelId: string;
};

type InvitationInput = ChannelScopedInput & {
  invitedOrganizationId?: string;
  invitedEmail?: string;
  invitedMspId?: string;
  expiresAt?: string;
};

type AcceptInvitationInput = ListScopedInput & {
  invitationId: string;
  mspId?: string;
  certificateFingerprint?: string;
  certificateIssuer?: string;
  certificateExpiresAt?: string;
};

type RevokeInvitationInput = ListScopedInput & {
  invitationId: string;
};

type ProposalInput = ChannelScopedInput & {
  proposalType?: string;
  proposalPayload?: unknown;
  requiredApprovals?: number;
};

type ProposalDecisionInput = ListScopedInput & {
  proposalId: string;
  rationale?: string;
};

type OperatorExecutionInput = ListScopedInput & {
  proposalId: string;
  evidenceType?: string;
  storageUri?: string;
  contentHash?: string;
  metadata?: unknown;
  operatorSummary?: string;
};

type OperatorFailureInput = OperatorExecutionInput & {
  failureReason?: string;
};

type FabricChannelWithRelations = FabricChannel & {
  memberships: (FabricChannelMembership & {
    organization?: { legalName: string } | null;
  })[];
  invitations: (FabricChannelInvitation & {
    invitedOrganization?: { legalName: string } | null;
  })[];
  proposals: FabricChannelProposalWithRelations[];
};

type FabricChannelProposalWithRelations = FabricChannelProposal & {
  approvals: FabricGovernanceApproval[];
  evidence: FabricGovernanceEvidence[];
};

const platformOperatorRole = 'PLATFORM_OPERATOR';
const governanceAdminRoles = ['ORG_ADMIN', 'FABRIC_GOVERNANCE_ADMIN'] as const;
const readonlyGovernanceRoles = [...fabricGovernanceReadRoles];

@Injectable()
export class FabricGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async listNetworks(input: ListScopedInput = {}) {
    const actor = await this.requireReadableActor(input);
    const where = this.isPlatformOperator(actor)
      ? {}
      : {
          OR: [
            { operatorOrganizationId: actor.organizationId },
            {
              channels: {
                some: {
                  OR: [
                    { createdByOrganizationId: actor.organizationId },
                    {
                      memberships: {
                        some: { organizationId: actor.organizationId },
                      },
                    },
                  ],
                },
              },
            },
          ],
        };

    const networks = await this.prisma.fabricNetwork.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return networks.map(formatNetwork);
  }

  async createNetwork(input: CreateNetworkInput) {
    const actor = await this.requireGovernanceActor(input);
    const name = requiredText(input.name, 'name');
    const environment = input.environment?.trim() || 'local';

    const network = await this.prisma.fabricNetwork.create({
      data: {
        name,
        environment,
        governanceModel: 'operator_assisted',
        operatorOrganizationId:
          input.operatorOrganizationId?.trim() || actor.organizationId,
        status: 'draft',
      },
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_NETWORK_CREATED',
      entityType: 'FabricNetwork',
      entityId: network.id,
      metadata: {
        name: network.name,
        environment: network.environment,
        governanceModel: network.governanceModel,
        topologyMutation: false,
      },
    });

    return formatNetwork(network);
  }

  async listChannels(input: ListScopedInput = {}) {
    const actor = await this.requireReadableActor(input);
    const channels = await this.prisma.fabricChannel.findMany({
      where: this.visibleChannelWhere(actor),
      ...channelInclude(),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return channels.map(formatChannel);
  }

  async getChannel(input: ChannelScopedInput) {
    const actor = await this.requireReadableActor(input);
    const channel = await this.findVisibleChannel(input.fabricChannelId, actor);

    return formatChannel(channel);
  }

  async createChannel(input: CreateChannelInput) {
    const actor = await this.requireGovernanceActor(input);
    const channelName = requiredText(input.channelName, 'channelName');
    const network = await this.resolveNetwork({
      actor,
      fabricNetworkId: input.fabricNetworkId,
      networkName: input.networkName,
      networkEnvironment: input.networkEnvironment,
    });
    const payload = {
      channelName,
      chaincodeName: optionalText(input.chaincodeName),
      networkId: network.id,
      mspId: optionalText(input.mspId),
      requestedByOrganizationId: actor.organizationId,
      governanceBoundary:
        'operator_assisted_metadata_only_no_fabric_topology_mutation',
    };
    const proposalDigest = digestPayload(payload);

    const channel = await this.prisma.$transaction(async (tx) => {
      const createdChannel = await tx.fabricChannel.create({
        data: {
          fabricNetworkId: network.id,
          channelName,
          chaincodeName: payload.chaincodeName,
          createdByOrganizationId: actor.organizationId,
          status: 'proposed',
          readinessStatus: 'operator_pending',
          memberships: {
            create: {
              organizationId: actor.organizationId,
              mspId: payload.mspId,
              membershipStatus: 'operator_pending',
            },
          },
          proposals: {
            create: {
              proposalType: 'create_channel',
              status: 'pending_approval',
              proposalPayload: payload,
              proposalDigest,
              requiredApprovals: 2,
              createdByUserId: actor.actorUserId,
            },
          },
        },
        ...channelInclude(),
      });

      if (input.invitedOrganizationId || input.invitedEmail) {
        await tx.fabricChannelInvitation.create({
          data: {
            fabricChannelId: createdChannel.id,
            createdByOrganizationId: actor.organizationId,
            invitedOrganizationId: optionalText(input.invitedOrganizationId),
            invitedEmail: optionalText(input.invitedEmail),
            invitedMspId: optionalText(input.invitedMspId),
            createdByUserId: actor.actorUserId,
          },
        });
      }

      return createdChannel;
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_PROPOSED',
      entityType: 'FabricChannel',
      entityId: channel.id,
      metadata: {
        channelName,
        chaincodeName: payload.chaincodeName,
        proposalDigest,
        topologyMutation: false,
        operatorExecutionRequired: true,
      },
    });

    return formatChannel(channel);
  }

  async getReadiness(input: ChannelScopedInput) {
    const actor = await this.requireReadableActor(input);
    const channel = await this.findVisibleChannel(input.fabricChannelId, actor);
    const latestProposal = latestProposalOf(channel.proposals);
    const approvedCount = latestProposal
      ? latestProposal.approvals.filter(
          (approval) => approval.decision === 'approved',
        ).length
      : 0;
    const runtime = runtimeReadiness(channel);
    const governanceReady =
      Boolean(latestProposal) &&
      latestProposal?.status === 'executed' &&
      approvedCount >= latestProposal.requiredApprovals;
    const invitationReady =
      channel.invitations.length === 0 ||
      channel.invitations.every((invitation) =>
        ['accepted', 'revoked'].includes(invitation.status),
      );
    const ready =
      channel.status === 'active' &&
      governanceReady &&
      invitationReady &&
      runtime.gatewayConfigured &&
      runtime.configuredForChannel;
    const limitations = [
      'Channel topology is operator-executed outside the app.',
      'MEPN stores governance metadata and sanitized evidence only.',
      ...(runtime.limitations ?? []),
    ];

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_READINESS_CHECKED',
      entityType: 'FabricChannel',
      entityId: channel.id,
      metadata: {
        ready,
        channelStatus: channel.status,
        proposalStatus: latestProposal?.status ?? 'none',
        topologyMutation: false,
      },
    });

    return {
      fabricChannelId: channel.id,
      channelName: channel.channelName,
      status: channel.status,
      readinessStatus: ready ? 'ready' : channel.readinessStatus,
      ready,
      governance: {
        requiredApprovals: latestProposal?.requiredApprovals ?? 0,
        receivedApprovals: approvedCount,
        latestProposalStatus: latestProposal?.status ?? 'none',
        operatorExecution:
          latestProposal?.status === 'executed'
            ? 'executed'
            : latestProposal?.status === 'failed'
              ? 'failed'
              : 'operator_pending',
      },
      invitations: {
        total: channel.invitations.length,
        pending: channel.invitations.filter(
          (invitation) => invitation.status === 'pending',
        ).length,
        accepted: channel.invitations.filter(
          (invitation) => invitation.status === 'accepted',
        ).length,
      },
      memberships: {
        total: channel.memberships.length,
        joined: channel.memberships.filter(
          (membership) => membership.membershipStatus === 'joined',
        ).length,
        operatorPending: channel.memberships.filter((membership) =>
          ['operator_pending', 'accepted'].includes(
            membership.membershipStatus,
          ),
        ).length,
      },
      runtime,
      limitations,
    };
  }

  async getAutomationReadiness(input: ListScopedInput = {}) {
    await this.requireReadableActor(input);
    return getFabricTopologyAutomationReadiness();
  }

  async getUatBlockerDecisions(input: ListScopedInput = {}) {
    await this.requireReadableActor(input);
    return getFabricUatBlockerDecisionResponse();
  }

  async createInvitation(input: InvitationInput) {
    const actor = await this.requireGovernanceActor(input);
    const channel = await this.findVisibleChannel(input.fabricChannelId, actor);

    if (!this.canSponsorChannel(channel, actor)) {
      throw new ForbiddenException('Channel sponsor membership required');
    }

    if (!input.invitedOrganizationId?.trim() && !input.invitedEmail?.trim()) {
      throw new BadRequestException(
        'invitedOrganizationId or invitedEmail is required',
      );
    }

    const invitation = await this.prisma.fabricChannelInvitation.create({
      data: {
        fabricChannelId: channel.id,
        createdByOrganizationId: actor.organizationId,
        invitedOrganizationId: optionalText(input.invitedOrganizationId),
        invitedEmail: optionalText(input.invitedEmail),
        invitedMspId: optionalText(input.invitedMspId),
        expiresAt: parseOptionalDate(input.expiresAt),
        createdByUserId: actor.actorUserId,
      },
      include: {
        invitedOrganization: { select: { legalName: true } },
      },
    });

    if (invitation.invitedOrganizationId) {
      await this.prisma.fabricChannelMembership.upsert({
        where: {
          fabricChannelId_organizationId: {
            fabricChannelId: channel.id,
            organizationId: invitation.invitedOrganizationId,
          },
        },
        create: {
          fabricChannelId: channel.id,
          organizationId: invitation.invitedOrganizationId,
          mspId: invitation.invitedMspId,
          membershipStatus: 'invited',
        },
        update: {
          mspId: invitation.invitedMspId,
          membershipStatus: 'invited',
        },
      });
    }

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_INVITATION_CREATED',
      entityType: 'FabricChannelInvitation',
      entityId: invitation.id,
      metadata: {
        fabricChannelId: channel.id,
        invitedOrganizationId: invitation.invitedOrganizationId,
        invitedEmail: invitation.invitedEmail,
        topologyMutation: false,
      },
    });

    return formatInvitation(invitation);
  }

  async listInvitations(input: ChannelScopedInput) {
    const actor = await this.requireReadableActor(input);
    await this.findVisibleChannel(input.fabricChannelId, actor);

    const invitations = await this.prisma.fabricChannelInvitation.findMany({
      where: {
        fabricChannelId: input.fabricChannelId,
      },
      include: {
        invitedOrganization: { select: { legalName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map(formatInvitation);
  }

  async acceptInvitation(input: AcceptInvitationInput) {
    const actor = await this.requireGovernanceActor(
      input,
      governanceAdminRoles,
    );
    const invitation = await this.prisma.fabricChannelInvitation.findUnique({
      where: { id: input.invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Fabric channel invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation is not pending');
    }

    if (
      invitation.invitedOrganizationId &&
      invitation.invitedOrganizationId !== actor.organizationId
    ) {
      throw new ForbiddenException(
        'Invitation is for a different organization',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const acceptedInvitation = await tx.fabricChannelInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedByUserId: actor.actorUserId,
          invitedOrganizationId:
            invitation.invitedOrganizationId ?? actor.organizationId,
        },
        include: {
          invitedOrganization: { select: { legalName: true } },
        },
      });

      await tx.fabricChannelMembership.upsert({
        where: {
          fabricChannelId_organizationId: {
            fabricChannelId: invitation.fabricChannelId,
            organizationId: actor.organizationId,
          },
        },
        create: {
          fabricChannelId: invitation.fabricChannelId,
          organizationId: actor.organizationId,
          mspId: optionalText(input.mspId) ?? invitation.invitedMspId,
          membershipStatus: 'accepted',
          certificateFingerprint: optionalText(input.certificateFingerprint),
          certificateIssuer: optionalText(input.certificateIssuer),
          certificateExpiresAt: parseOptionalDate(input.certificateExpiresAt),
        },
        update: {
          mspId: optionalText(input.mspId) ?? invitation.invitedMspId,
          membershipStatus: 'accepted',
          certificateFingerprint: optionalText(input.certificateFingerprint),
          certificateIssuer: optionalText(input.certificateIssuer),
          certificateExpiresAt: parseOptionalDate(input.certificateExpiresAt),
        },
      });

      return acceptedInvitation;
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_INVITATION_ACCEPTED',
      entityType: 'FabricChannelInvitation',
      entityId: updated.id,
      metadata: {
        fabricChannelId: updated.fabricChannelId,
        mspId: optionalText(input.mspId) ?? invitation.invitedMspId,
        topologyMutation: false,
        operatorExecutionRequired: true,
      },
    });

    return formatInvitation(updated);
  }

  async revokeInvitation(input: RevokeInvitationInput) {
    const actor = await this.requireGovernanceActor(input);
    const invitation = await this.prisma.fabricChannelInvitation.findUnique({
      where: { id: input.invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Fabric channel invitation not found');
    }

    if (
      invitation.createdByOrganizationId !== actor.organizationId &&
      !this.isPlatformOperator(actor)
    ) {
      throw new ForbiddenException(
        'Invitation sponsor or platform operator required',
      );
    }

    const revoked = await this.prisma.fabricChannelInvitation.update({
      where: { id: invitation.id },
      data: { status: 'revoked' },
      include: {
        invitedOrganization: { select: { legalName: true } },
      },
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_INVITATION_REVOKED',
      entityType: 'FabricChannelInvitation',
      entityId: revoked.id,
      metadata: {
        fabricChannelId: revoked.fabricChannelId,
        topologyMutation: false,
      },
    });

    return formatInvitation(revoked);
  }

  async listMemberships(input: ChannelScopedInput) {
    const actor = await this.requireReadableActor(input);
    await this.findVisibleChannel(input.fabricChannelId, actor);

    const memberships = await this.prisma.fabricChannelMembership.findMany({
      where: { fabricChannelId: input.fabricChannelId },
      include: {
        organization: { select: { legalName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map(formatMembership);
  }

  async createProposal(input: ProposalInput) {
    const actor = await this.requireGovernanceActor(input);
    const channel = await this.findVisibleChannel(input.fabricChannelId, actor);
    const proposalType = normalizeProposalType(input.proposalType);
    const requiredApprovals = normalizeRequiredApprovals(
      input.requiredApprovals,
    );
    const payload = {
      proposalType,
      channelName: channel.channelName,
      chaincodeName: channel.chaincodeName,
      requestedByOrganizationId: actor.organizationId,
      payload: input.proposalPayload ?? {},
      governanceBoundary:
        'operator_assisted_metadata_only_no_fabric_topology_mutation',
    };
    const proposalDigest = digestPayload(payload);
    const latest = latestProposalOf(channel.proposals);
    const revision = latest ? latest.revision + 1 : 1;

    const proposal = await this.prisma.fabricChannelProposal.create({
      data: {
        fabricChannelId: channel.id,
        proposalType,
        revision,
        status: 'pending_approval',
        proposalPayload: payload,
        proposalDigest,
        requiredApprovals,
        createdByUserId: actor.actorUserId,
      },
      include: proposalInclude().include,
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_PROPOSED',
      entityType: 'FabricChannelProposal',
      entityId: proposal.id,
      metadata: {
        fabricChannelId: channel.id,
        proposalType,
        revision,
        proposalDigest,
        topologyMutation: false,
      },
    });

    return formatProposal(proposal);
  }

  async getProposal(input: ProposalDecisionInput) {
    const actor = await this.requireReadableActor(input);
    const proposal = await this.prisma.fabricChannelProposal.findUnique({
      where: { id: input.proposalId },
      include: {
        ...proposalInclude().include,
        channel: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Fabric channel proposal not found');
    }

    if (!this.canSeeChannel(proposal.channel, actor)) {
      throw new ForbiddenException('Fabric channel is not visible');
    }

    return formatProposal(proposal);
  }

  async approveProposal(input: ProposalDecisionInput) {
    const actor = await this.requireGovernanceActor(input);
    const proposal = await this.findVisibleProposal(input.proposalId, actor);
    const roleCode = governanceRoleOf(actor) ?? actor.roleCodes[0] ?? 'UNKNOWN';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.fabricGovernanceApproval.upsert({
        where: {
          proposalId_organizationId_actorUserId: {
            proposalId: proposal.id,
            organizationId: actor.organizationId,
            actorUserId: actor.actorUserId,
          },
        },
        create: {
          proposalId: proposal.id,
          organizationId: actor.organizationId,
          actorUserId: actor.actorUserId,
          roleCode,
          decision: 'approved',
          rationale: optionalText(input.rationale),
        },
        update: {
          roleCode,
          decision: 'approved',
          rationale: optionalText(input.rationale),
        },
      });

      const approvedCount = await tx.fabricGovernanceApproval.count({
        where: {
          proposalId: proposal.id,
          decision: 'approved',
        },
      });
      const nextStatus =
        approvedCount >= proposal.requiredApprovals
          ? 'operator_pending'
          : 'pending_approval';

      return tx.fabricChannelProposal.update({
        where: { id: proposal.id },
        data: { status: nextStatus },
        include: proposalInclude().include,
      });
    });

    if (updated.status === 'operator_pending') {
      await this.prisma.fabricChannel.update({
        where: { id: updated.fabricChannelId },
        data: {
          status: 'operator_pending',
          readinessStatus: 'operator_pending',
        },
      });
    }

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_PROPOSAL_APPROVED',
      entityType: 'FabricChannelProposal',
      entityId: updated.id,
      metadata: {
        proposalType: updated.proposalType,
        status: updated.status,
        topologyMutation: false,
      },
    });

    return formatProposal(updated);
  }

  async rejectProposal(input: ProposalDecisionInput) {
    const actor = await this.requireGovernanceActor(input);
    const proposal = await this.findVisibleProposal(input.proposalId, actor);
    const roleCode = governanceRoleOf(actor) ?? actor.roleCodes[0] ?? 'UNKNOWN';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.fabricGovernanceApproval.upsert({
        where: {
          proposalId_organizationId_actorUserId: {
            proposalId: proposal.id,
            organizationId: actor.organizationId,
            actorUserId: actor.actorUserId,
          },
        },
        create: {
          proposalId: proposal.id,
          organizationId: actor.organizationId,
          actorUserId: actor.actorUserId,
          roleCode,
          decision: 'rejected',
          rationale: optionalText(input.rationale),
        },
        update: {
          roleCode,
          decision: 'rejected',
          rationale: optionalText(input.rationale),
        },
      });

      return tx.fabricChannelProposal.update({
        where: { id: proposal.id },
        data: { status: 'rejected' },
        include: proposalInclude().include,
      });
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_PROPOSAL_REJECTED',
      entityType: 'FabricChannelProposal',
      entityId: updated.id,
      metadata: {
        proposalType: updated.proposalType,
        topologyMutation: false,
      },
    });

    return formatProposal(updated);
  }

  async cancelProposal(input: ProposalDecisionInput) {
    const actor = await this.requireGovernanceActor(input);
    const proposal = await this.findVisibleProposal(input.proposalId, actor);

    if (
      proposal.createdByUserId !== actor.actorUserId &&
      !this.isPlatformOperator(actor)
    ) {
      throw new ForbiddenException(
        'Proposal creator or platform operator required',
      );
    }

    const updated = await this.prisma.fabricChannelProposal.update({
      where: { id: proposal.id },
      data: { status: 'cancelled' },
      include: proposalInclude().include,
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_PROPOSAL_CANCELLED',
      entityType: 'FabricChannelProposal',
      entityId: updated.id,
      metadata: {
        proposalType: updated.proposalType,
        topologyMutation: false,
      },
    });

    return formatProposal(updated);
  }

  async recordOperatorExecution(input: OperatorExecutionInput) {
    const actor = await this.requireOperatorActor(input);
    const proposal = await this.findVisibleProposal(input.proposalId, actor);
    const evidence = this.normalizeEvidenceInput(input);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.fabricGovernanceEvidence.create({
        data: {
          proposalId: proposal.id,
          evidenceType: evidence.evidenceType,
          storageUri: evidence.storageUri,
          contentHash: evidence.contentHash,
          metadata: evidence.metadata,
          createdByUserId: actor.actorUserId,
        },
      });

      const updatedProposal = await tx.fabricChannelProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'executed',
          operatorUserId: actor.actorUserId,
          executedAt: new Date(),
          failureReason: null,
        },
        include: proposalInclude().include,
      });

      await tx.fabricChannel.update({
        where: { id: proposal.fabricChannelId },
        data: {
          status: 'active',
          readinessStatus: 'runtime_check_required',
          operatorVerifiedAt: new Date(),
        },
      });

      await tx.fabricChannelMembership.updateMany({
        where: {
          fabricChannelId: proposal.fabricChannelId,
          membershipStatus: { in: ['operator_pending', 'accepted'] },
        },
        data: {
          membershipStatus: 'joined',
          joinedAt: new Date(),
        },
      });

      return updatedProposal;
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_OPERATOR_EXECUTION_RECORDED',
      entityType: 'FabricChannelProposal',
      entityId: updated.id,
      metadata: {
        proposalType: updated.proposalType,
        fabricChannelId: updated.fabricChannelId,
        topologyMutation: false,
        operatorExecutedOutsideApp: true,
      },
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_MEMBERSHIP_JOINED',
      entityType: 'FabricChannel',
      entityId: updated.fabricChannelId,
      metadata: {
        proposalId: updated.id,
        operatorExecutedOutsideApp: true,
      },
    });

    return formatProposal(updated);
  }

  async recordOperatorFailure(input: OperatorFailureInput) {
    const actor = await this.requireOperatorActor(input);
    const proposal = await this.findVisibleProposal(input.proposalId, actor);
    const failureReason = requiredText(input.failureReason, 'failureReason');
    const evidence = this.normalizeEvidenceInput({
      ...input,
      evidenceType: input.evidenceType ?? 'error_log_summary',
      operatorSummary: input.operatorSummary ?? failureReason,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.fabricGovernanceEvidence.create({
        data: {
          proposalId: proposal.id,
          evidenceType: evidence.evidenceType,
          storageUri: evidence.storageUri,
          contentHash: evidence.contentHash,
          metadata: evidence.metadata,
          createdByUserId: actor.actorUserId,
        },
      });

      const updatedProposal = await tx.fabricChannelProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'failed',
          operatorUserId: actor.actorUserId,
          failureReason,
        },
        include: proposalInclude().include,
      });

      await tx.fabricChannel.update({
        where: { id: proposal.fabricChannelId },
        data: {
          status: 'failed',
          readinessStatus: 'operator_failed',
        },
      });

      await tx.fabricChannelMembership.updateMany({
        where: {
          fabricChannelId: proposal.fabricChannelId,
          membershipStatus: { in: ['operator_pending'] },
        },
        data: {
          membershipStatus: 'failed',
        },
      });

      return updatedProposal;
    });

    await this.audit({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType: 'FABRIC_CHANNEL_OPERATOR_EXECUTION_FAILED',
      entityType: 'FabricChannelProposal',
      entityId: updated.id,
      metadata: {
        proposalType: updated.proposalType,
        failureReason,
        topologyMutation: false,
      },
    });

    return formatProposal(updated);
  }

  async listEvidence(input: ProposalDecisionInput) {
    const actor = await this.requireReadableActor(input);
    const proposal = await this.findVisibleProposal(input.proposalId, actor);

    const evidence = await this.prisma.fabricGovernanceEvidence.findMany({
      where: { proposalId: proposal.id },
      orderBy: { createdAt: 'desc' },
    });

    return evidence.map(formatEvidence);
  }

  private async resolveNetwork(input: {
    actor: FabricGovernanceActor;
    fabricNetworkId?: string;
    networkName?: string;
    networkEnvironment?: string;
  }) {
    if (input.fabricNetworkId?.trim()) {
      const network = await this.prisma.fabricNetwork.findUnique({
        where: { id: input.fabricNetworkId },
      });

      if (!network) {
        throw new NotFoundException('Fabric network not found');
      }

      return network;
    }

    const name = input.networkName?.trim() || 'MEPN Local Fabric Network';
    const environment = input.networkEnvironment?.trim() || 'local';
    const existing = await this.prisma.fabricNetwork.findFirst({
      where: {
        name,
        environment,
        operatorOrganizationId: input.actor.organizationId,
      },
    });

    if (existing) {
      return existing;
    }

    const network = await this.prisma.fabricNetwork.create({
      data: {
        name,
        environment,
        governanceModel: 'operator_assisted',
        operatorOrganizationId: input.actor.organizationId,
        status: 'draft',
      },
    });

    await this.audit({
      organizationId: input.actor.organizationId,
      actorUserId: input.actor.actorUserId,
      eventType: 'FABRIC_NETWORK_CREATED',
      entityType: 'FabricNetwork',
      entityId: network.id,
      metadata: {
        name,
        environment,
        topologyMutation: false,
      },
    });

    return network;
  }

  private async requireReadableActor(input: ListScopedInput = {}) {
    return this.requireActor(input, readonlyGovernanceRoles);
  }

  private async requireGovernanceActor(
    input: ListScopedInput = {},
    allowedRoles: readonly string[] = fabricGovernanceRoles,
  ) {
    return this.requireActor(input, allowedRoles);
  }

  private async requireOperatorActor(input: ListScopedInput = {}) {
    return this.requireActor(input, [platformOperatorRole]);
  }

  private async requireActor(
    input: ListScopedInput = {},
    allowedRoles: readonly string[],
  ): Promise<FabricGovernanceActor> {
    const organizationId = requiredText(input.organizationId, 'organizationId');
    const actorUserId = requiredText(input.actorUserId, 'actorUserId');
    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId,
        userId: actorUserId,
        status: 'active',
      },
      include: {
        role: true,
      },
    });

    if (!memberships.length) {
      throw new ForbiddenException('Active organization membership required');
    }

    const roleCodes = memberships.map((membership) => membership.role.code);

    if (!roleCodes.some((roleCode) => allowedRoles.includes(roleCode))) {
      throw new ForbiddenException('Fabric governance role required');
    }

    return {
      organizationId,
      actorUserId,
      roleCodes,
    };
  }

  private visibleChannelWhere(actor: FabricGovernanceActor) {
    if (this.isPlatformOperator(actor)) {
      return {};
    }

    return {
      OR: [
        { createdByOrganizationId: actor.organizationId },
        {
          memberships: {
            some: { organizationId: actor.organizationId },
          },
        },
        {
          invitations: {
            some: { invitedOrganizationId: actor.organizationId },
          },
        },
      ],
    };
  }

  private async findVisibleChannel(
    fabricChannelId: string,
    actor: FabricGovernanceActor,
  ) {
    const channel = await this.prisma.fabricChannel.findFirst({
      where: {
        id: fabricChannelId,
        ...this.visibleChannelWhere(actor),
      },
      ...channelInclude(),
    });

    if (!channel) {
      throw new NotFoundException('Fabric channel not found');
    }

    return channel;
  }

  private async findVisibleProposal(
    proposalId: string,
    actor: FabricGovernanceActor,
  ) {
    const proposal = await this.prisma.fabricChannelProposal.findUnique({
      where: { id: proposalId },
      include: {
        ...proposalInclude().include,
        channel: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Fabric channel proposal not found');
    }

    if (!this.canSeeChannel(proposal.channel, actor)) {
      throw new ForbiddenException('Fabric channel is not visible');
    }

    return proposal;
  }

  private canSeeChannel(
    channel: FabricChannel & { memberships: FabricChannelMembership[] },
    actor: FabricGovernanceActor,
  ) {
    return (
      this.isPlatformOperator(actor) ||
      channel.createdByOrganizationId === actor.organizationId ||
      channel.memberships.some(
        (membership) => membership.organizationId === actor.organizationId,
      )
    );
  }

  private canSponsorChannel(
    channel: FabricChannelWithRelations,
    actor: FabricGovernanceActor,
  ) {
    return (
      this.isPlatformOperator(actor) ||
      channel.createdByOrganizationId === actor.organizationId ||
      channel.memberships.some(
        (membership) =>
          membership.organizationId === actor.organizationId &&
          ['joined', 'operator_pending'].includes(membership.membershipStatus),
      )
    );
  }

  private isPlatformOperator(actor: FabricGovernanceActor) {
    return actor.roleCodes.includes(platformOperatorRole);
  }

  private normalizeEvidenceInput(input: OperatorExecutionInput) {
    const evidenceType = normalizeEvidenceType(input.evidenceType);
    const metadata = normalizeEvidenceMetadata({
      ...(isRecord(input.metadata) ? input.metadata : {}),
      operatorSummary:
        input.operatorSummary ??
        'Operator executed Fabric governance action outside MEPN.',
      boundary:
        'sanitized operator attestation; confidential admin material excluded',
    });
    const storageUri = optionalText(input.storageUri);
    const contentHash = optionalText(input.contentHash);

    assertSanitizedFabricGovernanceEvidence({
      evidenceType,
      storageUri,
      contentHash,
      metadata,
    });

    return {
      evidenceType,
      storageUri,
      contentHash,
      metadata,
    };
  }

  private audit(input: {
    organizationId: string;
    actorUserId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    metadata: Prisma.InputJsonObject;
  }) {
    return this.auditEvents.create(input);
  }
}

function channelInclude() {
  return {
    include: {
      memberships: {
        include: {
          organization: {
            select: { legalName: true },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
      invitations: {
        include: {
          invitedOrganization: {
            select: { legalName: true },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      proposals: {
        include: proposalInclude().include,
        orderBy: { createdAt: 'desc' as const },
      },
    },
  };
}

function proposalInclude() {
  return {
    include: {
      approvals: {
        orderBy: { createdAt: 'asc' as const },
      },
      evidence: {
        orderBy: { createdAt: 'desc' as const },
      },
    },
  };
}

function formatNetwork(network: FabricNetwork): FabricNetworkDto {
  return {
    id: network.id,
    name: network.name,
    environment: network.environment,
    governanceModel: network.governanceModel,
    operatorOrganizationId: network.operatorOrganizationId,
    status: network.status,
    createdAt: network.createdAt.toISOString(),
    updatedAt: network.updatedAt.toISOString(),
  };
}

function formatChannel(channel: FabricChannelWithRelations): FabricChannelDto {
  return {
    id: channel.id,
    fabricNetworkId: channel.fabricNetworkId,
    channelName: channel.channelName,
    chaincodeName: channel.chaincodeName,
    status: channel.status,
    readinessStatus: channel.readinessStatus,
    createdByOrganizationId: channel.createdByOrganizationId,
    operatorVerifiedAt: channel.operatorVerifiedAt?.toISOString() ?? null,
    memberships: channel.memberships.map(formatMembership),
    invitations: channel.invitations.map(formatInvitation),
    proposals: channel.proposals.map(formatProposal),
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

function formatMembership(
  membership: FabricChannelMembership & {
    organization?: { legalName: string } | null;
  },
): FabricChannelMembershipDto {
  return {
    id: membership.id,
    fabricChannelId: membership.fabricChannelId,
    organizationId: membership.organizationId,
    organizationName: membership.organization?.legalName,
    mspId: membership.mspId,
    membershipStatus: membership.membershipStatus,
    certificateFingerprint: membership.certificateFingerprint,
    certificateIssuer: membership.certificateIssuer,
    certificateExpiresAt:
      membership.certificateExpiresAt?.toISOString() ?? null,
    joinedAt: membership.joinedAt?.toISOString() ?? null,
  };
}

function formatInvitation(
  invitation: FabricChannelInvitation & {
    invitedOrganization?: { legalName: string } | null;
  },
): FabricChannelInvitationDto {
  return {
    id: invitation.id,
    fabricChannelId: invitation.fabricChannelId,
    createdByOrganizationId: invitation.createdByOrganizationId,
    invitedOrganizationId: invitation.invitedOrganizationId,
    invitedOrganizationName: invitation.invitedOrganization?.legalName ?? null,
    invitedEmail: invitation.invitedEmail,
    invitedMspId: invitation.invitedMspId,
    status: invitation.status,
    expiresAt: invitation.expiresAt?.toISOString() ?? null,
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    createdByUserId: invitation.createdByUserId,
    acceptedByUserId: invitation.acceptedByUserId,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
  };
}

function formatProposal(
  proposal: FabricChannelProposalWithRelations,
): FabricChannelProposalDto {
  const receivedApprovals = proposal.approvals.filter(
    (approval) => approval.decision === 'approved',
  ).length;

  return {
    id: proposal.id,
    fabricChannelId: proposal.fabricChannelId,
    proposalType: proposal.proposalType,
    revision: proposal.revision,
    status: proposal.status,
    proposalPayload: proposal.proposalPayload,
    proposalDigest: proposal.proposalDigest,
    requiredApprovals: proposal.requiredApprovals,
    receivedApprovals,
    createdByUserId: proposal.createdByUserId,
    operatorUserId: proposal.operatorUserId,
    executedAt: proposal.executedAt?.toISOString() ?? null,
    failureReason: proposal.failureReason,
    supersededByProposalId: proposal.supersededByProposalId,
    approvals: proposal.approvals.map(formatApproval),
    evidence: proposal.evidence.map(formatEvidence),
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };
}

function formatApproval(
  approval: FabricGovernanceApproval,
): FabricGovernanceApprovalDto {
  return {
    id: approval.id,
    proposalId: approval.proposalId,
    organizationId: approval.organizationId,
    actorUserId: approval.actorUserId,
    roleCode: approval.roleCode,
    decision: approval.decision,
    rationale: approval.rationale,
    createdAt: approval.createdAt.toISOString(),
  };
}

function formatEvidence(
  evidence: FabricGovernanceEvidence,
): FabricGovernanceEvidenceDto {
  return {
    id: evidence.id,
    proposalId: evidence.proposalId,
    evidenceType: evidence.evidenceType,
    storageUri: evidence.storageUri,
    contentHash: evidence.contentHash,
    metadata: evidence.metadata,
    createdByUserId: evidence.createdByUserId,
    createdAt: evidence.createdAt.toISOString(),
  };
}

function latestProposalOf(proposals: FabricChannelProposalWithRelations[]) {
  return [...proposals].sort((left, right) => {
    if (left.revision !== right.revision) {
      return right.revision - left.revision;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
}

function runtimeReadiness(channel: {
  channelName: string;
  chaincodeName: string | null;
}) {
  try {
    const fabricEnv = readFabricEnv();
    const missingGatewayConfig =
      fabricEnv.mode === 'gateway' ? missingFabricGatewayConfig() : [];
    const gatewayConfigured =
      fabricEnv.mode === 'gateway' && missingGatewayConfig.length === 0;
    const configuredForChannel =
      gatewayConfigured &&
      fabricEnv.channel === channel.channelName &&
      (!channel.chaincodeName || fabricEnv.chaincode === channel.chaincodeName);

    return {
      mode: fabricEnv.mode,
      gatewayConfigured,
      chaincodeConfigured: Boolean(fabricEnv.chaincode),
      configuredChannel: redactConfiguredValue(fabricEnv.channel),
      configuredChaincode: redactConfiguredValue(fabricEnv.chaincode),
      configuredForChannel,
      missingGatewayConfig,
      limitations: configuredForChannel
        ? []
        : [
            'Current API Fabric Gateway runtime is not configured for this channel metadata.',
          ],
    };
  } catch (error) {
    return {
      mode: 'unavailable',
      gatewayConfigured: false,
      chaincodeConfigured: false,
      configuredChannel: 'not_configured',
      configuredChaincode: 'not_configured',
      configuredForChannel: false,
      missingGatewayConfig: missingFabricGatewayConfig(),
      limitations: [
        error instanceof Error
          ? error.message
          : 'Unable to read Fabric Gateway runtime configuration.',
      ],
    };
  }
}

function requiredText(value: string | undefined, name: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new BadRequestException(`${name} is required`);
  }

  return trimmed;
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseOptionalDate(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date value: ${trimmed}`);
  }

  return parsed;
}

function normalizeRequiredApprovals(value: number | undefined) {
  if (value === undefined || value === null) {
    return 2;
  }

  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new BadRequestException('requiredApprovals must be 1 to 10');
  }

  return value;
}

function digestPayload(payload: unknown) {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function governanceRoleOf(actor: FabricGovernanceActor) {
  return (
    actor.roleCodes.find((roleCode) =>
      fabricGovernanceRoles.includes(roleCode as never),
    ) ??
    actor.roleCodes.find((roleCode) =>
      readonlyGovernanceRoles.includes(roleCode as never),
    )
  );
}

function normalizeEvidenceMetadata(value: Record<string, unknown>) {
  assertSanitizedFabricGovernanceEvidence(value);

  return value as Prisma.InputJsonObject;
}

function redactConfiguredValue(value: string) {
  return value ? 'configured' : 'not_configured';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
