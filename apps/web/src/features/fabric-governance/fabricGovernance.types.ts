export type FabricGovernanceMembership = {
  id: string
  fabricChannelId: string
  organizationId: string
  organizationName?: string
  mspId?: string | null
  membershipStatus: string
  certificateFingerprint?: string | null
  certificateIssuer?: string | null
  certificateExpiresAt?: string | null
  joinedAt?: string | null
}

export type FabricGovernanceInvitation = {
  id: string
  fabricChannelId: string
  createdByOrganizationId: string
  invitedOrganizationId?: string | null
  invitedOrganizationName?: string | null
  invitedEmail?: string | null
  invitedMspId?: string | null
  status: string
  expiresAt?: string | null
  acceptedAt?: string | null
  createdByUserId?: string | null
  acceptedByUserId?: string | null
  createdAt: string
  updatedAt: string
}

export type FabricGovernanceApproval = {
  id: string
  proposalId: string
  organizationId: string
  actorUserId: string
  roleCode: string
  decision: string
  rationale?: string | null
  createdAt: string
}

export type FabricGovernanceEvidence = {
  id: string
  proposalId: string
  evidenceType: string
  storageUri?: string | null
  contentHash?: string | null
  metadata?: unknown
  createdByUserId: string
  createdAt: string
}

export type FabricGovernanceProposal = {
  id: string
  fabricChannelId: string
  proposalType: string
  revision: number
  status: string
  proposalPayload: unknown
  proposalDigest: string
  requiredApprovals: number
  receivedApprovals: number
  createdByUserId: string
  operatorUserId?: string | null
  executedAt?: string | null
  failureReason?: string | null
  supersededByProposalId?: string | null
  approvals: FabricGovernanceApproval[]
  evidence: FabricGovernanceEvidence[]
  createdAt: string
  updatedAt: string
}

export type FabricGovernanceChannel = {
  id: string
  fabricNetworkId: string
  channelName: string
  chaincodeName?: string | null
  status: string
  readinessStatus: string
  createdByOrganizationId: string
  operatorVerifiedAt?: string | null
  memberships: FabricGovernanceMembership[]
  invitations: FabricGovernanceInvitation[]
  proposals: FabricGovernanceProposal[]
  createdAt: string
  updatedAt: string
}

export type FabricGovernanceReadiness = {
  fabricChannelId: string
  channelName: string
  status: string
  readinessStatus: string
  ready: boolean
  governance: {
    requiredApprovals: number
    receivedApprovals: number
    latestProposalStatus: string
    operatorExecution: string
  }
  invitations: {
    total: number
    pending: number
    accepted: number
  }
  memberships: {
    total: number
    joined: number
    operatorPending: number
  }
  runtime: {
    mode: string
    gatewayConfigured: boolean
    chaincodeConfigured: boolean
    configuredChannel: string
    configuredChaincode: string
    configuredForChannel: boolean
    missingGatewayConfig: string[]
    limitations: string[]
  }
  limitations: string[]
}

export type FabricTopologyAutomationRequirement = {
  id: string
  label: string
  configured: boolean
  source: 'environment' | 'runtime' | 'decision'
}

export type FabricTopologyAutomationReadiness = {
  enabled: boolean
  status: 'disabled' | 'blocked' | 'ready'
  executionMode: 'not_enabled' | 'operator_agent'
  checkedAt: string
  requirements: FabricTopologyAutomationRequirement[]
  missingRequirementIds: string[]
  limitations: string[]
  nextActions: string[]
}

export type FabricUatBlockerResolutionStatus =
  | 'resolved_by_decision'
  | 'resolved_by_live_gate'

export type FabricUatBlockerDecision = {
  id: 'UAT-B-003' | 'UAT-B-004'
  title: string
  status: FabricUatBlockerResolutionStatus
  decision: string
  implementedBoundary: string
  topologyMutationSupported: false
  directFabricExecutionSupported: false
  operatorAssistedOnly: boolean
  localSeedCanPass: boolean
  seededProofAccepted: boolean
  liveEvidenceRequired: boolean
  readAnchorRequired: boolean
  verificationTruthRule: string
  acceptedAdr: 'ADR-016'
  supportingAdr: 'ADR-015' | null
  evidencePath: string
  nextAction: string
}

export type FabricUatBlockerDecisionResponse = {
  checkedAt: string
  adr: {
    id: 'ADR-016'
    status: 'accepted'
    path: 'docs/adr/ADR-016-uat-fabric-blocker-resolution-path.md'
  }
  decisions: FabricUatBlockerDecision[]
}
