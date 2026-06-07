#!/usr/bin/env node

import {
  defaultSeedPassword,
  localFederationNodeDefinitions,
} from './local-node-catalog.mjs';
import {
  localFederationChannelDefinitions,
  localFederationChannelPlanVersion,
  validateLocalFederationChannelPlan,
} from './local-node-channel-plan.mjs';

const sharedSecret =
  process.env.NODE_FEDERATION_SHARED_SECRET || 'local-demo-federation-only';

const options = parseArgs(process.argv.slice(2));
const nodeMap = new Map(
  localFederationNodeDefinitions.map((definition) => [
    definition.key,
    { ...definition },
  ]),
);

async function main() {
  const planErrors = validateLocalFederationChannelPlan();

  if (planErrors.length) {
    throw new Error(`Invalid local federation channel plan:\n${planErrors.join('\n')}`);
  }

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          planVersion: localFederationChannelPlanVersion,
          nodeCount: localFederationNodeDefinitions.length,
          channels: localFederationChannelDefinitions.map((channel) => ({
            name: channel.name,
            type: channel.type,
            sourceNodeKey: channel.sourceNodeKey,
            memberNodeKeys: channel.memberNodeKeys,
          })),
          realFabricTopologyMutation: false,
          realFabricProof: false,
        },
        null,
        2,
      ),
    );
    return;
  }

  for (const node of nodeMap.values()) {
    node.session = await loginNode(node);
  }

  const results = [];

  for (const channel of localFederationChannelDefinitions) {
    results.push(await bootstrapChannel(channel));
  }

  console.log(
    JSON.stringify(
      {
        mode: 'executed',
        planVersion: localFederationChannelPlanVersion,
        channelCount: results.length,
        channels: results,
        realFabricTopologyMutation: false,
        realFabricProof: false,
      },
      null,
      2,
    ),
  );
}

async function bootstrapChannel(channelDefinition) {
  const source = getNode(channelDefinition.sourceNodeKey);
  const members = channelDefinition.memberNodeKeys.map(getNode);
  const peers = [];

  for (const member of members) {
    if (member.key === source.key) {
      continue;
    }

    peers.push(await createPeer(source, member));
  }

  const channel = await createChannel(source, channelDefinition);

  for (const peer of peers) {
    await invitePeer(source, channel.id, peer.id);
  }

  for (const member of members) {
    if (member.key === source.key) {
      continue;
    }

    await mirrorChannelEvent({
      source,
      target: member,
      channelDefinition,
      status: 'simulated_invited',
      memberStatus: (nodeKey) =>
        nodeKey === member.key ? 'simulated_invited' : 'simulated_joined',
      eventPhase: 'invite',
    });
    await acceptLocalMembership(member, channelDefinition.name, member.key);
  }

  for (const member of members) {
    if (member.key === source.key) {
      continue;
    }

    await acceptLocalMembership(source, channelDefinition.name, member.key);
  }

  for (const member of members) {
    if (member.key === source.key) {
      continue;
    }

    await mirrorChannelEvent({
      source,
      target: member,
      channelDefinition,
      status: 'simulated_active',
      memberStatus: () => 'simulated_joined',
      eventPhase: 'active-sync',
    });
  }

  const sourceChannels = await listChannels(source);
  const sourceChannel = findChannel(sourceChannels, channelDefinition.name);

  return {
    name: channelDefinition.name,
    type: channelDefinition.type,
    sourceNodeKey: source.key,
    memberNodeKeys: channelDefinition.memberNodeKeys,
    sourceStatus: sourceChannel.status,
    sourceMemberships: sourceChannel.memberships.map((membership) => ({
      nodeKey: membership.nodeKey,
      membershipStatus: membership.membershipStatus,
    })),
  };
}

async function loginNode(node) {
  const session = await api(node, 'POST', '/auth/password-login', {
    email: `admin@${node.key}.local`,
    password: defaultSeedPassword,
  });

  return {
    organizationId: required(session.organizationId, `${node.key} organizationId`),
    actorUserId: required(session.userId, `${node.key} userId`),
  };
}

async function createPeer(source, target) {
  return api(source, 'POST', '/node-federation/peers', {
    ...scope(source),
    peerNodeKey: target.key,
    peerOrganizationName: target.legalName,
    peerNodeType: target.type,
    peerApiUrl: target.apiUrl,
    peerWebUrl: target.webUrl,
  });
}

async function createChannel(source, channelDefinition) {
  return api(source, 'POST', '/node-federation/channels', {
    ...scope(source),
    channelName: channelDefinition.name,
    channelType: channelDefinition.type,
    purpose: channelDefinition.purpose,
    visibilityScope: channelDefinition.visibilityScope,
    status: 'simulated_proposed',
  });
}

async function invitePeer(source, channelId, peerId) {
  return api(source, 'POST', `/node-federation/channels/${channelId}/invite`, {
    ...scope(source),
    peerId,
  });
}

async function mirrorChannelEvent(input) {
  const memberships = input.channelDefinition.memberNodeKeys.map((nodeKey) => {
    const node = getNode(nodeKey);

    return {
      nodeKey: node.key,
      organizationName: node.legalName,
      nodeType: node.type,
      peerApiUrl: node.apiUrl,
      peerWebUrl: node.webUrl,
      membershipStatus: input.memberStatus(nodeKey),
    };
  });

  return api(
    input.target,
    'POST',
    '/node-federation/events',
    {
      localNodeKey: input.target.key,
      eventType: 'node_channel_invitation',
      idempotencyKey: [
        localFederationChannelPlanVersion,
        input.eventPhase,
        input.channelDefinition.name,
        input.source.key,
        input.target.key,
      ].join(':'),
      sourceNode: {
        nodeKey: input.source.key,
        organizationName: input.source.legalName,
        nodeType: input.source.type,
        apiUrl: input.source.apiUrl,
        webUrl: input.source.webUrl,
      },
      channel: {
        channelName: input.channelDefinition.name,
        channelType: input.channelDefinition.type,
        purpose: input.channelDefinition.purpose,
        visibilityScope: input.channelDefinition.visibilityScope,
        status: input.status,
      },
      memberships,
    },
    {
      'x-mepn-node-secret': sharedSecret,
    },
  );
}

async function acceptLocalMembership(node, channelName, memberNodeKey) {
  const channels = await listChannels(node);
  const channel = findChannel(channels, channelName);
  const membership = channel.memberships.find(
    (item) => item.nodeKey === memberNodeKey,
  );

  if (!membership) {
    throw new Error(
      `Missing membership ${memberNodeKey} on ${node.key}/${channelName}`,
    );
  }

  if (membership.membershipStatus === 'simulated_joined') {
    return channel;
  }

  return api(
    node,
    'POST',
    `/node-federation/invitations/${membership.id}/accept`,
    scope(node),
  );
}

async function listChannels(node) {
  const query = new URLSearchParams(scope(node)).toString();

  return api(node, 'GET', `/node-federation/channels?${query}`);
}

function findChannel(channels, channelName) {
  const channel = channels.find((item) => item.channelName === channelName);

  if (!channel) {
    throw new Error(`Channel ${channelName} not found`);
  }

  return channel;
}

async function api(node, method, path, body, headers = {}) {
  const response = await fetch(`${node.apiUrl}/api/v1${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `${method} ${node.key} ${path} failed with ${response.status}: ${sanitizeError(
        text,
      )}`,
    );
  }

  return parsed;
}

function scope(node) {
  return {
    organizationId: node.session.organizationId,
    actorUserId: node.session.actorUserId,
    localNodeKey: node.key,
  };
}

function getNode(nodeKey) {
  const node = nodeMap.get(nodeKey);

  if (!node) {
    throw new Error(`Unknown local federation node: ${nodeKey}`);
  }

  return node;
}

function required(value, label) {
  if (!value) {
    throw new Error(`Missing ${label}`);
  }

  return value;
}

function sanitizeError(value) {
  return String(value)
    .replace(/password["':=][^"',}\s]+/gi, 'password=<redacted>')
    .replace(/token["':=][^"',}\s]+/gi, 'token=<redacted>')
    .slice(0, 800);
}

function parseArgs(args) {
  return {
    dryRun: args.includes('--dry-run'),
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
