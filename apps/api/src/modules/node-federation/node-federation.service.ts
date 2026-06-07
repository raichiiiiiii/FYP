import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  NodeChannel,
  NodeChannelMembership,
  NodeDeployment,
  NodePeer,
  Prisma,
} from '@prisma/client';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { PrismaService } from '../../database/prisma.service';
import {
  assertSafeNodeFederationPayload,
  normalizeNodeChannelStatus,
  normalizeNodeChannelType,
  type NodeChannelDto,
  type NodeChannelMembershipDto,
  type NodeDeploymentDto,
  type NodeFederationActor,
  type NodeFederationCanvasDto,
  type NodePeerDto,
} from './node-federation.dto';

type ScopedInput = {
  organizationId?: string;
  actorUserId?: string;
  localNodeKey?: string;
};

type CreatePeerInput = ScopedInput & {
  peerNodeKey?: string;
  peerOrganizationName?: string;
  peerNodeType?: string;
  peerApiUrl?: string;
  peerWebUrl?: string;
  metadata?: unknown;
};

type CreateChannelInput = ScopedInput & {
  channelName?: string;
  channelType?: string;
  purpose?: string;
  visibilityScope?: string;
  status?: string;
  metadata?: unknown;
};

type InviteChannelInput = ScopedInput & {
  channelId: string;
  peerId?: string;
  peerNodeKey?: string;
  peerOrganizationName?: string;
  peerNodeType?: string;
  peerApiUrl?: string;
  peerWebUrl?: string;
};

type AcceptInvitationInput = ScopedInput & {
  invitationId: string;
};

type ReceiveEventInput = {
  localNodeKey?: string;
  eventType?: string;
  idempotencyKey?: string;
  sourceNode?: {
    nodeKey?: string;
    organizationName?: string;
    nodeType?: string;
    apiUrl?: string;
    webUrl?: string;
  };
  channel?: {
    channelName?: string;
    channelType?: string;
    purpose?: string;
    visibilityScope?: string;
    status?: string;
  };
  memberships?: Array<{
    nodeKey?: string;
    organizationName?: string;
    nodeType?: string;
    peerApiUrl?: string;
    peerWebUrl?: string;
    membershipStatus?: string;
  }>;
  payload?: unknown;
};

type NodeChannelWithMemberships = NodeChannel & {
  memberships: NodeChannelMembership[];
};

const mutationRoles = new Set([
  'ORG_ADMIN',
  'PLATFORM_OPERATOR',
  'FABRIC_OPERATOR',
  'FABRIC_GOVERNANCE_ADMIN',
]);

@Injectable()
export class NodeFederationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async getStatus(input: ScopedInput = {}) {
    const actor = await this.requireReadableActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const [peerCount, channelCount, inboundEventCount, outboundEventCount] =
      await Promise.all([
        this.prisma.nodePeer.count({ where: { localNodeId: localNode.id } }),
        this.prisma.nodeChannel.count({ where: { localNodeId: localNode.id } }),
        this.prisma.inboundNodeEvent.count({
          where: { localNodeId: localNode.id },
        }),
        this.prisma.outboundNodeEvent.count({
          where: { localNodeId: localNode.id },
        }),
      ]);

    return {
      localNode: formatDeployment(localNode),
      mode: 'local_simulated_federation',
      realFabricTopologyMutation: false,
      proofTruthRule:
        'Simulated node federation does not create real Fabric topology or verified Fabric proof.',
      counts: {
        peers: peerCount,
        channels: channelCount,
        inboundEvents: inboundEventCount,
        outboundEvents: outboundEventCount,
      },
    };
  }

  async listPeers(input: ScopedInput = {}) {
    const actor = await this.requireReadableActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const peers = await this.prisma.nodePeer.findMany({
      where: { localNodeId: localNode.id },
      orderBy: { peerNodeKey: 'asc' },
    });

    return peers.map(formatPeer);
  }

  async createPeer(input: CreatePeerInput) {
    assertSafeNodeFederationPayload(input.metadata);
    const actor = await this.requireMutationActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const peerNodeKey = requiredText(input.peerNodeKey, 'peerNodeKey');

    if (peerNodeKey === localNode.nodeKey) {
      throw new BadRequestException('Peer node cannot be the local node');
    }

    const peer = await this.prisma.nodePeer.upsert({
      where: {
        localNodeId_peerNodeKey: {
          localNodeId: localNode.id,
          peerNodeKey,
        },
      },
      update: {
        peerOrganizationName: requiredText(
          input.peerOrganizationName,
          'peerOrganizationName',
        ),
        peerNodeType: input.peerNodeType?.trim() || 'UNKNOWN',
        peerApiUrl: optionalText(input.peerApiUrl),
        peerWebUrl: optionalText(input.peerWebUrl),
        status: 'configured',
        metadata: jsonOrNull(input.metadata),
      },
      create: {
        localNodeId: localNode.id,
        peerNodeKey,
        peerOrganizationName: requiredText(
          input.peerOrganizationName,
          'peerOrganizationName',
        ),
        peerNodeType: input.peerNodeType?.trim() || 'UNKNOWN',
        peerApiUrl: optionalText(input.peerApiUrl),
        peerWebUrl: optionalText(input.peerWebUrl),
        status: 'configured',
        metadata: jsonOrNull(input.metadata),
      },
    });

    await this.audit(actor, 'NODE_PEER_CONFIGURED', 'NodePeer', peer.id, {
      peerNodeKey: peer.peerNodeKey,
      peerOrganizationName: peer.peerOrganizationName,
      simulatedOnly: true,
    });

    return formatPeer(peer);
  }

  async pingPeer(input: ScopedInput & { peerId: string }) {
    const actor = await this.requireMutationActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const peer = await this.findPeer(localNode.id, input.peerId);
    const updated = await this.prisma.nodePeer.update({
      where: { id: peer.id },
      data: {
        status: 'reachable',
        lastSeenAt: new Date(),
      },
    });

    return formatPeer(updated);
  }

  async listChannels(input: ScopedInput = {}) {
    const actor = await this.requireReadableActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const channels = await this.prisma.nodeChannel.findMany({
      where: { localNodeId: localNode.id },
      include: { memberships: true },
      orderBy: { channelName: 'asc' },
    });

    return channels.map(formatChannel);
  }

  async createChannel(input: CreateChannelInput) {
    assertSafeNodeFederationPayload(input.metadata);
    const actor = await this.requireMutationActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
    });
    const channelName = requiredText(input.channelName, 'channelName');
    const channelType = normalizeNodeChannelType(input.channelType);
    const status = normalizeNodeChannelStatus(input.status);

    const channel = await this.prisma.nodeChannel.upsert({
      where: {
        localNodeId_channelName: {
          localNodeId: localNode.id,
          channelName,
        },
      },
      update: {
        channelType,
        status,
        purpose: optionalText(input.purpose),
        visibilityScope: input.visibilityScope?.trim() || 'organization',
        metadata: jsonOrNull(input.metadata),
      },
      create: {
        localNodeId: localNode.id,
        channelName,
        channelType,
        status,
        purpose: optionalText(input.purpose),
        visibilityScope: input.visibilityScope?.trim() || 'organization',
        createdByNodeKey: localNode.nodeKey,
        metadata: jsonOrNull(input.metadata),
        memberships: {
          create: {
            nodeKey: localNode.nodeKey,
            organizationName: organization.legalName,
            nodeType: localNode.nodeType,
            membershipStatus: 'simulated_joined',
            peerApiUrl: localNode.publicApiUrl,
            peerWebUrl: localNode.publicWebUrl,
            joinedAt: new Date(),
          },
        },
      },
      include: { memberships: true },
    });

    await this.audit(actor, 'NODE_CHANNEL_CREATED', 'NodeChannel', channel.id, {
      channelName,
      channelType,
      simulatedOnly: true,
      realFabricTopologyMutation: false,
    });

    return formatChannel(channel);
  }

  async inviteChannel(input: InviteChannelInput) {
    const actor = await this.requireMutationActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const channel = await this.findChannel(localNode.id, input.channelId);
    const peer =
      input.peerId?.trim() && !input.peerNodeKey?.trim()
        ? await this.findPeer(localNode.id, input.peerId)
        : await this.upsertPeerFromInvite(localNode.id, input);

    const membership = await this.prisma.nodeChannelMembership.upsert({
      where: {
        channelId_nodeKey: {
          channelId: channel.id,
          nodeKey: peer.peerNodeKey,
        },
      },
      update: {
        organizationName: peer.peerOrganizationName,
        nodeType: peer.peerNodeType,
        membershipStatus: 'simulated_invited',
        peerApiUrl: peer.peerApiUrl,
        peerWebUrl: peer.peerWebUrl,
        joinedAt: null,
      },
      create: {
        channelId: channel.id,
        nodeKey: peer.peerNodeKey,
        organizationName: peer.peerOrganizationName,
        nodeType: peer.peerNodeType,
        membershipStatus: 'simulated_invited',
        peerApiUrl: peer.peerApiUrl,
        peerWebUrl: peer.peerWebUrl,
      },
    });
    const outbound = await this.prisma.outboundNodeEvent.create({
      data: {
        localNodeId: localNode.id,
        peerId: peer.id,
        eventType: 'node_channel_invitation',
        idempotencyKey: `node-channel-invitation:${channel.id}:${peer.peerNodeKey}:${randomUUID()}`,
        payload: {
          sourceNode: {
            nodeKey: localNode.nodeKey,
            organizationName: localNode.displayName,
            nodeType: localNode.nodeType,
            apiUrl: localNode.publicApiUrl,
            webUrl: localNode.publicWebUrl,
          },
          channel: {
            channelName: channel.channelName,
            channelType: channel.channelType,
            purpose: channel.purpose,
            visibilityScope: channel.visibilityScope,
            status: 'simulated_invited',
          },
          memberships: [
            ...channel.memberships.map((item) => ({
              nodeKey: item.nodeKey,
              organizationName: item.organizationName,
              nodeType: item.nodeType,
              peerApiUrl: item.peerApiUrl,
              peerWebUrl: item.peerWebUrl,
              membershipStatus: item.membershipStatus,
            })),
            {
              nodeKey: membership.nodeKey,
              organizationName: membership.organizationName,
              nodeType: membership.nodeType,
              peerApiUrl: membership.peerApiUrl,
              peerWebUrl: membership.peerWebUrl,
              membershipStatus: membership.membershipStatus,
            },
          ],
        },
      },
    });

    await this.audit(
      actor,
      'NODE_CHANNEL_PEER_INVITED',
      'NodeChannel',
      channel.id,
      {
        peerNodeKey: peer.peerNodeKey,
        membershipId: membership.id,
        outboundEventId: outbound.id,
        simulatedOnly: true,
      },
    );

    const refreshed = await this.findChannel(localNode.id, channel.id);

    return {
      channel: formatChannel(refreshed),
      outboundEvent: {
        id: outbound.id,
        eventType: outbound.eventType,
        status: outbound.status,
        idempotencyKey: outbound.idempotencyKey,
      },
    };
  }

  async acceptInvitation(input: AcceptInvitationInput) {
    const actor = await this.requireMutationActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const membership = await this.prisma.nodeChannelMembership.findFirst({
      where: {
        id: input.invitationId,
        channel: { localNodeId: localNode.id },
      },
      include: { channel: { include: { memberships: true } } },
    });

    if (!membership) {
      throw new NotFoundException('Node channel invitation not found');
    }

    await this.prisma.nodeChannelMembership.update({
      where: { id: membership.id },
      data: {
        membershipStatus: 'simulated_joined',
        joinedAt: new Date(),
      },
    });
    const allMemberships = await this.prisma.nodeChannelMembership.findMany({
      where: { channelId: membership.channelId },
    });
    const allJoined = allMemberships.every(
      (item) =>
        item.id === membership.id ||
        item.membershipStatus === 'simulated_joined',
    );

    if (allJoined) {
      await this.prisma.nodeChannel.update({
        where: { id: membership.channelId },
        data: { status: 'simulated_active' },
      });
    }

    await this.audit(
      actor,
      'NODE_CHANNEL_INVITATION_ACCEPTED',
      'NodeChannelMembership',
      membership.id,
      {
        channelId: membership.channelId,
        simulatedOnly: true,
      },
    );

    return formatChannel(
      await this.findChannel(localNode.id, membership.channelId),
    );
  }

  async receiveEvent(
    input: ReceiveEventInput,
    headers: Record<string, string>,
  ) {
    this.assertSharedSecret(headers);
    assertSafeNodeFederationPayload(input);

    const eventType = requiredText(input.eventType, 'eventType');
    const idempotencyKey = requiredText(input.idempotencyKey, 'idempotencyKey');
    const sourceNode = input.sourceNode ?? {};
    const sourceNodeKey = requiredText(
      sourceNode.nodeKey,
      'sourceNode.nodeKey',
    );
    const localNode = await this.findLocalNodeForEvent(input.localNodeKey);
    const existing = await this.prisma.inboundNodeEvent.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return {
        eventId: existing.id,
        status: existing.status,
        idempotentReplay: true,
      };
    }

    await this.prisma.nodePeer.upsert({
      where: {
        localNodeId_peerNodeKey: {
          localNodeId: localNode.id,
          peerNodeKey: sourceNodeKey,
        },
      },
      update: {
        peerOrganizationName: requiredText(
          sourceNode.organizationName,
          'sourceNode.organizationName',
        ),
        peerNodeType: sourceNode.nodeType?.trim() || 'UNKNOWN',
        peerApiUrl: optionalText(sourceNode.apiUrl),
        peerWebUrl: optionalText(sourceNode.webUrl),
        status: 'reachable',
        lastSeenAt: new Date(),
      },
      create: {
        localNodeId: localNode.id,
        peerNodeKey: sourceNodeKey,
        peerOrganizationName: requiredText(
          sourceNode.organizationName,
          'sourceNode.organizationName',
        ),
        peerNodeType: sourceNode.nodeType?.trim() || 'UNKNOWN',
        peerApiUrl: optionalText(sourceNode.apiUrl),
        peerWebUrl: optionalText(sourceNode.webUrl),
        status: 'reachable',
        lastSeenAt: new Date(),
      },
    });

    if (eventType === 'node_channel_invitation') {
      await this.applyChannelInvitationEvent(localNode, input);
    }

    const inbound = await this.prisma.inboundNodeEvent.create({
      data: {
        localNodeId: localNode.id,
        sourceNodeKey,
        eventType,
        idempotencyKey,
        payload: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue,
        status: 'processed',
        processedAt: new Date(),
      },
    });

    return {
      eventId: inbound.id,
      status: inbound.status,
      idempotentReplay: false,
    };
  }

  async getCanvas(input: ScopedInput = {}): Promise<NodeFederationCanvasDto> {
    const actor = await this.requireReadableActor(input);
    const localNode = await this.ensureLocalNode(actor, input.localNodeKey);
    const [peers, channels] = await Promise.all([
      this.prisma.nodePeer.findMany({
        where: { localNodeId: localNode.id },
        orderBy: { peerNodeKey: 'asc' },
      }),
      this.prisma.nodeChannel.findMany({
        where: { localNodeId: localNode.id },
        include: { memberships: true },
        orderBy: { channelName: 'asc' },
      }),
    ]);

    return buildCanvas(localNode, peers, channels);
  }

  private async requireReadableActor(input: ScopedInput) {
    return this.requireActor(input, false);
  }

  private async requireMutationActor(input: ScopedInput) {
    return this.requireActor(input, true);
  }

  private async requireActor(input: ScopedInput, mutation: boolean) {
    const organizationId = requiredText(input.organizationId, 'organizationId');
    const actorUserId = requiredText(input.actorUserId, 'actorUserId');
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId: actorUserId,
        status: 'active',
      },
      include: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Active node organization membership required',
      );
    }

    const actor: NodeFederationActor = {
      organizationId,
      actorUserId,
      roleCodes: [membership.role.code],
    };

    if (
      mutation &&
      !actor.roleCodes.some((roleCode) => mutationRoles.has(roleCode))
    ) {
      throw new ForbiddenException('Node federation admin role required');
    }

    return actor;
  }

  private async ensureLocalNode(
    actor: NodeFederationActor,
    requestedNodeKey?: string,
  ) {
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
    });
    const nodeKey =
      requestedNodeKey?.trim() ||
      process.env.MEPN_NODE_KEY?.trim() ||
      slugify(organization.registrationNumber || organization.legalName);

    return this.prisma.nodeDeployment.upsert({
      where: { nodeKey },
      update: {
        organizationId: organization.id,
        displayName: process.env.MEPN_NODE_ORG_NAME || organization.legalName,
        nodeType: process.env.MEPN_NODE_ORG_TYPE || organization.deploymentMode,
        publicWebUrl: process.env.MEPN_NODE_PUBLIC_WEB_URL || null,
        publicApiUrl: process.env.MEPN_NODE_PUBLIC_API_URL || null,
        status: 'local',
      },
      create: {
        nodeKey,
        organizationId: organization.id,
        displayName: process.env.MEPN_NODE_ORG_NAME || organization.legalName,
        nodeType: process.env.MEPN_NODE_ORG_TYPE || organization.deploymentMode,
        publicWebUrl: process.env.MEPN_NODE_PUBLIC_WEB_URL || null,
        publicApiUrl: process.env.MEPN_NODE_PUBLIC_API_URL || null,
        status: 'local',
      },
    });
  }

  private async findLocalNodeForEvent(localNodeKey?: string) {
    const nodeKey = localNodeKey?.trim() || process.env.MEPN_NODE_KEY?.trim();

    if (!nodeKey) {
      const count = await this.prisma.nodeDeployment.count();

      if (count !== 1) {
        throw new BadRequestException(
          'localNodeKey is required when multiple or no local node deployments exist',
        );
      }

      return this.prisma.nodeDeployment.findFirstOrThrow();
    }

    const localNode = await this.prisma.nodeDeployment.findUnique({
      where: { nodeKey },
    });

    if (!localNode) {
      throw new NotFoundException('Local node deployment not found');
    }

    return localNode;
  }

  private async findPeer(localNodeId: string, peerId: string) {
    const peer = await this.prisma.nodePeer.findFirst({
      where: { id: peerId, localNodeId },
    });

    if (!peer) {
      throw new NotFoundException('Node peer not found');
    }

    return peer;
  }

  private async findChannel(localNodeId: string, channelId: string) {
    const channel = await this.prisma.nodeChannel.findFirst({
      where: { id: channelId, localNodeId },
      include: { memberships: true },
    });

    if (!channel) {
      throw new NotFoundException('Node channel not found');
    }

    return channel;
  }

  private async upsertPeerFromInvite(
    localNodeId: string,
    input: InviteChannelInput,
  ) {
    const peerNodeKey = requiredText(input.peerNodeKey, 'peerNodeKey');

    return this.prisma.nodePeer.upsert({
      where: {
        localNodeId_peerNodeKey: {
          localNodeId,
          peerNodeKey,
        },
      },
      update: {
        peerOrganizationName: requiredText(
          input.peerOrganizationName,
          'peerOrganizationName',
        ),
        peerNodeType: input.peerNodeType?.trim() || 'UNKNOWN',
        peerApiUrl: optionalText(input.peerApiUrl),
        peerWebUrl: optionalText(input.peerWebUrl),
        status: 'configured',
      },
      create: {
        localNodeId,
        peerNodeKey,
        peerOrganizationName: requiredText(
          input.peerOrganizationName,
          'peerOrganizationName',
        ),
        peerNodeType: input.peerNodeType?.trim() || 'UNKNOWN',
        peerApiUrl: optionalText(input.peerApiUrl),
        peerWebUrl: optionalText(input.peerWebUrl),
        status: 'configured',
      },
    });
  }

  private async applyChannelInvitationEvent(
    localNode: NodeDeployment,
    input: ReceiveEventInput,
  ) {
    const channelInput = input.channel ?? {};
    const channelName = requiredText(
      channelInput.channelName,
      'channel.channelName',
    );
    const channelType = normalizeNodeChannelType(channelInput.channelType);
    const status = normalizeNodeChannelStatus(
      channelInput.status,
      'simulated_invited',
    );
    const channel = await this.prisma.nodeChannel.upsert({
      where: {
        localNodeId_channelName: {
          localNodeId: localNode.id,
          channelName,
        },
      },
      update: {
        channelType,
        status,
        purpose: optionalText(channelInput.purpose),
        visibilityScope: channelInput.visibilityScope?.trim() || 'organization',
      },
      create: {
        localNodeId: localNode.id,
        channelName,
        channelType,
        status,
        purpose: optionalText(channelInput.purpose),
        visibilityScope: channelInput.visibilityScope?.trim() || 'organization',
        createdByNodeKey: requiredText(
          input.sourceNode?.nodeKey,
          'sourceNode.nodeKey',
        ),
      },
    });

    const memberships = input.memberships?.length
      ? input.memberships
      : [
          {
            nodeKey: localNode.nodeKey,
            organizationName: localNode.displayName,
            nodeType: localNode.nodeType,
            peerApiUrl: localNode.publicApiUrl ?? undefined,
            peerWebUrl: localNode.publicWebUrl ?? undefined,
            membershipStatus: 'simulated_invited',
          },
        ];

    for (const membership of memberships) {
      const nodeKey = requiredText(membership.nodeKey, 'membership.nodeKey');
      await this.prisma.nodeChannelMembership.upsert({
        where: {
          channelId_nodeKey: {
            channelId: channel.id,
            nodeKey,
          },
        },
        update: {
          organizationName: requiredText(
            membership.organizationName,
            'membership.organizationName',
          ),
          nodeType: membership.nodeType?.trim() || 'UNKNOWN',
          membershipStatus:
            membership.membershipStatus?.trim() || 'simulated_invited',
          peerApiUrl: optionalText(membership.peerApiUrl),
          peerWebUrl: optionalText(membership.peerWebUrl),
        },
        create: {
          channelId: channel.id,
          nodeKey,
          organizationName: requiredText(
            membership.organizationName,
            'membership.organizationName',
          ),
          nodeType: membership.nodeType?.trim() || 'UNKNOWN',
          membershipStatus:
            membership.membershipStatus?.trim() || 'simulated_invited',
          peerApiUrl: optionalText(membership.peerApiUrl),
          peerWebUrl: optionalText(membership.peerWebUrl),
        },
      });
    }
  }

  private assertSharedSecret(headers: Record<string, string>) {
    const configuredSecret =
      process.env.NODE_FEDERATION_SHARED_SECRET || 'local-demo-federation-only';
    const providedSecret =
      headers['x-mepn-node-secret'] || headers['X-MEPN-Node-Secret'];

    if (!providedSecret || providedSecret !== configuredSecret) {
      throw new ForbiddenException('Invalid node federation shared secret');
    }
  }

  private async audit(
    actor: NodeFederationActor,
    eventType: string,
    entityType: string,
    entityId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    await this.auditEvents.create({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      eventType,
      entityType,
      entityId,
      metadata,
    });
  }
}

function formatDeployment(value: NodeDeployment): NodeDeploymentDto {
  return {
    id: value.id,
    nodeKey: value.nodeKey,
    organizationId: value.organizationId,
    displayName: value.displayName,
    nodeType: value.nodeType,
    publicWebUrl: value.publicWebUrl,
    publicApiUrl: value.publicApiUrl,
    status: value.status,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

function formatPeer(value: NodePeer): NodePeerDto {
  return {
    id: value.id,
    localNodeId: value.localNodeId,
    peerNodeKey: value.peerNodeKey,
    peerOrganizationName: value.peerOrganizationName,
    peerNodeType: value.peerNodeType,
    peerApiUrl: value.peerApiUrl,
    peerWebUrl: value.peerWebUrl,
    status: value.status,
    lastSeenAt: value.lastSeenAt?.toISOString() ?? null,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

function formatMembership(
  value: NodeChannelMembership,
): NodeChannelMembershipDto {
  return {
    id: value.id,
    channelId: value.channelId,
    nodeKey: value.nodeKey,
    organizationName: value.organizationName,
    nodeType: value.nodeType,
    membershipStatus: value.membershipStatus,
    peerApiUrl: value.peerApiUrl,
    peerWebUrl: value.peerWebUrl,
    joinedAt: value.joinedAt?.toISOString() ?? null,
  };
}

function formatChannel(value: NodeChannelWithMemberships): NodeChannelDto {
  return {
    id: value.id,
    localNodeId: value.localNodeId,
    channelName: value.channelName,
    channelType: value.channelType,
    status: value.status,
    purpose: value.purpose,
    visibilityScope: value.visibilityScope,
    createdByNodeKey: value.createdByNodeKey,
    memberships: value.memberships.map(formatMembership),
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

function buildCanvas(
  localNode: NodeDeployment,
  peers: NodePeer[],
  channels: NodeChannelWithMemberships[],
): NodeFederationCanvasDto {
  const nodes: NodeFederationCanvasDto['nodes'] = [
    {
      id: `node:${localNode.nodeKey}`,
      type: 'node_deployment',
      label: localNode.displayName,
      status: localNode.status,
      nodeKey: localNode.nodeKey,
      nodeType: localNode.nodeType,
    },
    ...peers.map((peer) => ({
      id: `node:${peer.peerNodeKey}`,
      type: 'peer_node' as const,
      label: peer.peerOrganizationName,
      status: peer.status,
      nodeKey: peer.peerNodeKey,
      nodeType: peer.peerNodeType,
    })),
    ...channels.map((channel) => ({
      id: `channel:${channel.channelName}`,
      type: 'simulated_channel' as const,
      label: channel.channelName,
      status: channel.status,
      channelType: channel.channelType,
    })),
  ];
  const edges: NodeFederationCanvasDto['edges'] = [
    ...peers.map((peer) => ({
      id: `peer:${localNode.nodeKey}:${peer.peerNodeKey}`,
      source: `node:${localNode.nodeKey}`,
      target: `node:${peer.peerNodeKey}`,
      type: 'peers_with' as const,
      label: 'peers with',
    })),
  ];

  for (const channel of channels) {
    for (const membership of channel.memberships) {
      edges.push({
        id: `membership:${channel.channelName}:${membership.nodeKey}`,
        source: `node:${membership.nodeKey}`,
        target: `channel:${channel.channelName}`,
        type:
          channel.channelType === 'FINANCE_ENTITY_DATA_SHARING'
            ? 'shares_finance_data_on'
            : channel.channelType === 'PRIVATE_AWARD_OR_DEAL'
              ? 'private_channel'
              : 'participates_in_channel',
        label: membership.membershipStatus,
      });
    }
  }

  return { nodes, edges };
}

function requiredText(value: string | undefined, label: string) {
  const text = value?.trim();

  if (!text) {
    throw new BadRequestException(`${label} is required`);
  }

  return text;
}

function optionalText(value: string | undefined) {
  const text = value?.trim();

  return text || null;
}

function jsonOrNull(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
