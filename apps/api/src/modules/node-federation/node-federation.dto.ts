import { BadRequestException } from '@nestjs/common';

export const nodeChannelTypes = [
  'SHARED_TENDER_COMPETITION',
  'PRIVATE_AWARD_OR_DEAL',
  'FINANCE_ENTITY_DATA_SHARING',
  'FINANCE_BACKUP_SUPPORT',
  'LOCAL_SIMULATED',
] as const;

export const nodeChannelStatuses = [
  'simulated_proposed',
  'simulated_invited',
  'simulated_joined',
  'simulated_active',
  'operator_pending',
  'real_fabric_unavailable',
] as const;

export type NodeChannelType = (typeof nodeChannelTypes)[number];
export type NodeChannelStatus = (typeof nodeChannelStatuses)[number];

export type NodeFederationActor = {
  organizationId: string;
  actorUserId: string;
  roleCodes: string[];
};

export type NodeDeploymentDto = {
  id: string;
  nodeKey: string;
  organizationId: string | null;
  displayName: string;
  nodeType: string;
  publicWebUrl: string | null;
  publicApiUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type NodePeerDto = {
  id: string;
  localNodeId: string;
  peerNodeKey: string;
  peerOrganizationName: string;
  peerNodeType: string;
  peerApiUrl: string | null;
  peerWebUrl: string | null;
  status: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NodeChannelMembershipDto = {
  id: string;
  channelId: string;
  nodeKey: string;
  organizationName: string;
  nodeType: string;
  membershipStatus: string;
  peerApiUrl: string | null;
  peerWebUrl: string | null;
  joinedAt: string | null;
};

export type NodeChannelDto = {
  id: string;
  localNodeId: string;
  channelName: string;
  channelType: string;
  status: string;
  purpose: string | null;
  visibilityScope: string;
  createdByNodeKey: string;
  memberships: NodeChannelMembershipDto[];
  createdAt: string;
  updatedAt: string;
};

export type NodeFederationCanvasDto = {
  nodes: Array<{
    id: string;
    type: 'node_deployment' | 'peer_node' | 'simulated_channel';
    label: string;
    status: string;
    nodeKey?: string;
    nodeType?: string;
    channelType?: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type:
      | 'hosts'
      | 'peers_with'
      | 'participates_in_channel'
      | 'shares_finance_data_on'
      | 'private_channel';
    label: string;
  }>;
};

const dangerousNodeFederationPatterns = [
  /-----BEGIN [^-]+-----/i,
  /private[_ -]?key/i,
  /\bpassword\b/i,
  /\btoken\b/i,
  /\bauthorization\b/i,
  /\bsecret\b/i,
  /\.env/i,
  /key\.pem/i,
  /cert\.pem/i,
  /msp[\\/]/i,
];

export function normalizeNodeChannelType(value?: string): NodeChannelType {
  const normalized = value?.trim().toUpperCase() || 'LOCAL_SIMULATED';

  if (!nodeChannelTypes.includes(normalized as NodeChannelType)) {
    throw new BadRequestException('Unsupported node federation channel type');
  }

  return normalized as NodeChannelType;
}

export function normalizeNodeChannelStatus(
  value?: string,
  fallback: NodeChannelStatus = 'simulated_proposed',
): NodeChannelStatus {
  const normalized = value?.trim().toLowerCase() || fallback;

  if (!nodeChannelStatuses.includes(normalized as NodeChannelStatus)) {
    throw new BadRequestException('Unsupported node federation channel status');
  }

  return normalized as NodeChannelStatus;
}

export function assertSafeNodeFederationPayload(value: unknown) {
  const dangerous = findDangerousValue(value);

  if (dangerous) {
    throw new BadRequestException(
      `Node federation payload contains secret-like material: ${dangerous}`,
    );
  }
}

function findDangerousValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const text = String(value);
    return dangerousNodeFederationPatterns.some((pattern) => pattern.test(text))
      ? text.slice(0, 80)
      : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const dangerous = findDangerousValue(item);

      if (dangerous) {
        return dangerous;
      }
    }

    return null;
  }

  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const dangerousKey = findDangerousValue(key);

      if (dangerousKey) {
        return dangerousKey;
      }

      const dangerousValue = findDangerousValue(item);

      if (dangerousValue) {
        return dangerousValue;
      }
    }
  }

  return null;
}
