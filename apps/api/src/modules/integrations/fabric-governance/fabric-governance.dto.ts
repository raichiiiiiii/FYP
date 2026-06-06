import { BadRequestException } from '@nestjs/common';

export const fabricGovernanceRoles = [
  'ORG_ADMIN',
  'FABRIC_GOVERNANCE_ADMIN',
  'PLATFORM_OPERATOR',
] as const;

export const fabricGovernanceReadRoles = [
  ...fabricGovernanceRoles,
  'AUDITOR',
] as const;

export const fabricProposalTypes = [
  'create_channel',
  'invite_org',
  'join_channel',
  'update_policy',
  'remove_org',
] as const;

export const fabricEvidenceTypes = [
  'operator_command_summary',
  'config_update_digest',
  'channel_readiness_check',
  'gateway_probe',
  'error_log_summary',
] as const;

export type FabricProposalType = (typeof fabricProposalTypes)[number];

export type FabricEvidenceType = (typeof fabricEvidenceTypes)[number];

export type FabricGovernanceActor = {
  organizationId: string;
  actorUserId: string;
  roleCodes: string[];
};

export type FabricNetworkDto = {
  id: string;
  name: string;
  environment: string;
  governanceModel: string;
  operatorOrganizationId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type FabricChannelDto = {
  id: string;
  fabricNetworkId: string;
  channelName: string;
  chaincodeName: string | null;
  status: string;
  readinessStatus: string;
  createdByOrganizationId: string;
  operatorVerifiedAt: string | null;
  memberships: FabricChannelMembershipDto[];
  invitations: FabricChannelInvitationDto[];
  proposals: FabricChannelProposalDto[];
  createdAt: string;
  updatedAt: string;
};

export type FabricChannelMembershipDto = {
  id: string;
  fabricChannelId: string;
  organizationId: string;
  organizationName?: string;
  mspId: string | null;
  membershipStatus: string;
  certificateFingerprint: string | null;
  certificateIssuer: string | null;
  certificateExpiresAt: string | null;
  joinedAt: string | null;
};

export type FabricChannelInvitationDto = {
  id: string;
  fabricChannelId: string;
  createdByOrganizationId: string;
  invitedOrganizationId: string | null;
  invitedOrganizationName?: string | null;
  invitedEmail: string | null;
  invitedMspId: string | null;
  status: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdByUserId: string | null;
  acceptedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FabricChannelProposalDto = {
  id: string;
  fabricChannelId: string;
  proposalType: string;
  revision: number;
  status: string;
  proposalPayload: unknown;
  proposalDigest: string;
  requiredApprovals: number;
  receivedApprovals: number;
  createdByUserId: string;
  operatorUserId: string | null;
  executedAt: string | null;
  failureReason: string | null;
  supersededByProposalId: string | null;
  approvals: FabricGovernanceApprovalDto[];
  evidence: FabricGovernanceEvidenceDto[];
  createdAt: string;
  updatedAt: string;
};

export type FabricGovernanceApprovalDto = {
  id: string;
  proposalId: string;
  organizationId: string;
  actorUserId: string;
  roleCode: string;
  decision: string;
  rationale: string | null;
  createdAt: string;
};

export type FabricGovernanceEvidenceDto = {
  id: string;
  proposalId: string;
  evidenceType: string;
  storageUri: string | null;
  contentHash: string | null;
  metadata: unknown;
  createdByUserId: string;
  createdAt: string;
};

const dangerousEvidencePatterns = [
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

export function normalizeProposalType(value?: string): FabricProposalType {
  const normalized = value?.trim().toLowerCase();

  if (
    !normalized ||
    !fabricProposalTypes.includes(normalized as FabricProposalType)
  ) {
    throw new BadRequestException('Unsupported Fabric channel proposal type');
  }

  return normalized as FabricProposalType;
}

export function normalizeEvidenceType(value?: string): FabricEvidenceType {
  const normalized = value?.trim().toLowerCase() || 'operator_command_summary';

  if (!fabricEvidenceTypes.includes(normalized as FabricEvidenceType)) {
    throw new BadRequestException(
      'Unsupported Fabric governance evidence type',
    );
  }

  return normalized as FabricEvidenceType;
}

export function assertSanitizedFabricGovernanceEvidence(value: unknown) {
  const dangerous = findDangerousEvidenceValue(value);

  if (dangerous) {
    throw new BadRequestException(
      `Fabric governance evidence contains secret-like material: ${dangerous}`,
    );
  }
}

function findDangerousEvidenceValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const text = String(value);
    return dangerousEvidencePatterns.some((pattern) => pattern.test(text))
      ? text.slice(0, 80)
      : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const dangerous = findDangerousEvidenceValue(item);

      if (dangerous) {
        return dangerous;
      }
    }

    return null;
  }

  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const dangerousKey = findDangerousEvidenceValue(key);

      if (dangerousKey) {
        return dangerousKey;
      }

      const dangerousValue = findDangerousEvidenceValue(item);

      if (dangerousValue) {
        return dangerousValue;
      }
    }
  }

  return null;
}
