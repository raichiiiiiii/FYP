export type NodeStatusValue = 'configured' | 'missing';

export type NodeStatusFeatureFlagDto = {
  id: string;
  label: string;
  enabled: boolean;
  source: 'environment' | 'runtime';
};

export type NodeStatusDatabaseDto = {
  provider: 'postgresql';
  schemaProvider: 'prisma';
  migrationStatus: 'available' | 'unavailable';
  appliedMigrationCount: number;
  latestMigration: string | null;
};

export type NodeStatusCompatibilityDto = {
  apiVersion: 'v1';
  canonicalHashVersion: 'v1';
  reportSchemaVersion: 'v1';
  channelJoinPackageVersion: 'v1';
  fabricTopologyMode: 'operator_assisted';
  topologyMutationSupported: false;
};

export type NodeStatusFabricDto = {
  proofInfrastructureOptional: true;
  topologyMutationSupported: false;
  automationReadinessEndpoint: '/api/v1/fabric/automation/readiness';
  uatBlockerDecisionEndpoint: '/api/v1/fabric/uat-blocker-decisions';
  uatBlockerDecisions: Array<{
    id: 'UAT-B-003' | 'UAT-B-004';
    status: 'resolved_by_decision' | 'resolved_by_live_gate';
    topologyMutationSupported: false;
    directFabricExecutionSupported: false;
    operatorAssistedOnly: boolean;
    seededProofAccepted: boolean;
    liveEvidenceRequired: boolean;
    readAnchorRequired: boolean;
  }>;
  automationStatus: 'disabled' | 'blocked' | 'ready';
  automationEnabled: boolean;
  configuredChannel: NodeStatusValue;
  configuredChaincode: NodeStatusValue;
  configuredMspId: NodeStatusValue;
  gatewayConfigured: boolean;
  missingGatewayConfig: string[];
};

export type NodeStatusResponseDto = {
  service: 'mepn-api';
  checkedAt: string;
  release: {
    appName: string;
    appVersion: string;
    packageSource: 'package-json' | 'fallback';
  };
  deployment: {
    model: 'self-hosted-organization-node';
    environment: string;
    localSystemOfRecord: true;
    sharedCloudRequired: false;
  };
  database: NodeStatusDatabaseDto;
  compatibility: NodeStatusCompatibilityDto;
  featureFlags: NodeStatusFeatureFlagDto[];
  fabric: NodeStatusFabricDto;
};
