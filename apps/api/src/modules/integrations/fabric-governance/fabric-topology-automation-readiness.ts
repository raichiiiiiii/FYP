export type FabricTopologyAutomationStatus = 'disabled' | 'blocked' | 'ready';

export type FabricTopologyAutomationRequirement = {
  id: string;
  label: string;
  configured: boolean;
  source: 'environment' | 'runtime' | 'decision';
};

export type FabricTopologyAutomationReadinessDto = {
  enabled: boolean;
  status: FabricTopologyAutomationStatus;
  executionMode: 'not_enabled' | 'operator_agent';
  checkedAt: string;
  requirements: FabricTopologyAutomationRequirement[];
  missingRequirementIds: string[];
  limitations: string[];
  nextActions: string[];
};

type EnvSource = Record<string, string | undefined>;

const envRequirements: Array<
  Omit<FabricTopologyAutomationRequirement, 'configured'> & {
    variable: string;
  }
> = [
  {
    id: 'operator-agent-url',
    label: 'Dedicated Fabric operator agent URL',
    source: 'environment',
    variable: 'FABRIC_OPERATOR_AGENT_URL',
  },
  {
    id: 'admin-msp-id',
    label: 'Fabric channel admin MSP ID',
    source: 'environment',
    variable: 'FABRIC_CHANNEL_ADMIN_MSP_ID',
  },
  {
    id: 'admin-cert-path',
    label: 'Fabric channel admin signing certificate path',
    source: 'environment',
    variable: 'FABRIC_CHANNEL_ADMIN_CERT_PATH',
  },
  {
    id: 'admin-key-path',
    label: 'Fabric channel admin signing key path',
    source: 'environment',
    variable: 'FABRIC_CHANNEL_ADMIN_KEY_PATH',
  },
  {
    id: 'orderer-admin-endpoint',
    label: 'Fabric orderer admin endpoint',
    source: 'environment',
    variable: 'FABRIC_ORDERER_ADMIN_ENDPOINT',
  },
  {
    id: 'orderer-admin-tls-cert-path',
    label: 'Fabric orderer admin TLS certificate path',
    source: 'environment',
    variable: 'FABRIC_ORDERER_ADMIN_TLS_CERT_PATH',
  },
  {
    id: 'orderer-admin-tls-key-path',
    label: 'Fabric orderer admin TLS key path',
    source: 'environment',
    variable: 'FABRIC_ORDERER_ADMIN_TLS_KEY_PATH',
  },
  {
    id: 'configtx-profile',
    label: 'Fabric configtx channel profile',
    source: 'environment',
    variable: 'FABRIC_CONFIGTX_PROFILE',
  },
  {
    id: 'configtx-path',
    label: 'Fabric configtx source path',
    source: 'environment',
    variable: 'FABRIC_CONFIGTX_PATH',
  },
];

const decisionRequirements: Array<
  Omit<FabricTopologyAutomationRequirement, 'configured'> & {
    variable: string;
  }
> = [
  {
    id: 'automation-adr-approved',
    label: 'Direct Fabric topology automation ADR approved',
    source: 'decision',
    variable: 'FABRIC_TOPOLOGY_AUTOMATION_ADR_APPROVED',
  },
  {
    id: 'secret-custody-approved',
    label: 'Channel admin secret custody model approved',
    source: 'decision',
    variable: 'FABRIC_TOPOLOGY_SECRET_CUSTODY_APPROVED',
  },
  {
    id: 'recovery-policy-approved',
    label: 'Topology mutation retry and recovery policy approved',
    source: 'decision',
    variable: 'FABRIC_TOPOLOGY_RECOVERY_POLICY_APPROVED',
  },
];

export function getFabricTopologyAutomationReadiness(
  source: EnvSource = process.env,
): FabricTopologyAutomationReadinessDto {
  const enabled = readBoolean(source.FABRIC_TOPOLOGY_AUTOMATION_ENABLED);
  const requirements = [...decisionRequirements, ...envRequirements].map(
    (requirement) => ({
      id: requirement.id,
      label: requirement.label,
      source: requirement.source,
      configured: Boolean(source[requirement.variable]?.trim()),
    }),
  );
  const missingRequirementIds = requirements
    .filter((requirement) => !requirement.configured)
    .map((requirement) => requirement.id);
  const status: FabricTopologyAutomationStatus = !enabled
    ? 'disabled'
    : missingRequirementIds.length
      ? 'blocked'
      : 'ready';

  return {
    enabled,
    status,
    executionMode: enabled ? 'operator_agent' : 'not_enabled',
    checkedAt: new Date().toISOString(),
    requirements,
    missingRequirementIds,
    limitations: limitationsFor(status),
    nextActions: nextActionsFor(status, missingRequirementIds),
  };
}

function readBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

function limitationsFor(status: FabricTopologyAutomationStatus) {
  if (status === 'ready') {
    return [
      'Direct Fabric topology execution is ready for a gated operator-agent integration test only.',
      'The API must still avoid printing or returning admin certificate, private key, MSP, or orderer secret contents.',
    ];
  }

  if (status === 'blocked') {
    return [
      'Direct Fabric topology execution is enabled but missing required decisions or operator-agent configuration.',
      'Operator-assisted governance remains the safe execution path until all requirements are satisfied.',
    ];
  }

  return [
    'Direct Fabric topology execution is disabled by default.',
    'Operator-assisted governance remains the active implementation boundary.',
  ];
}

function nextActionsFor(
  status: FabricTopologyAutomationStatus,
  missingRequirementIds: string[],
) {
  if (status === 'ready') {
    return [
      'Run gated real Fabric topology integration tests against a disposable consortium network.',
      'Keep operator-assisted execution available as a fallback path.',
    ];
  }

  if (status === 'blocked') {
    return [
      `Resolve missing requirements: ${missingRequirementIds.join(', ')}`,
      'Confirm admin secret mount permissions and operator-agent audit logging before enabling execution.',
    ];
  }

  return [
    'Approve a direct automation ADR before setting FABRIC_TOPOLOGY_AUTOMATION_ENABLED=true.',
    'Configure a dedicated operator agent and channel-admin secret mount separate from Gateway anchoring identity material.',
  ];
}
