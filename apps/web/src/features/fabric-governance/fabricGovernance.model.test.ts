import { describe, expect, it } from 'vitest'

import {
  automationReadinessSummary,
  canCreateFabricGovernanceProposal,
  canOperateFabricGovernance,
  decisionRiskLabel,
  decisionStatusLabel,
  hasSecretLikeText,
  latestProposal,
  proposalApprovalLabel,
  readinessSummary,
} from './fabricGovernance.model'
import type {
  FabricGovernanceChannel,
  FabricGovernanceReadiness,
  FabricTopologyAutomationReadiness,
  FabricUatBlockerDecision,
} from './fabricGovernance.types'

describe('fabric governance model', () => {
  it('separates proposer and operator capabilities by role', () => {
    expect(canCreateFabricGovernanceProposal(['ORG_ADMIN'])).toBe(true)
    expect(canCreateFabricGovernanceProposal(['FABRIC_GOVERNANCE_ADMIN'])).toBe(
      true,
    )
    expect(canCreateFabricGovernanceProposal(['PROCUREMENT_OFFICER'])).toBe(
      false,
    )
    expect(canOperateFabricGovernance(['PLATFORM_OPERATOR'])).toBe(true)
    expect(canOperateFabricGovernance(['ORG_ADMIN'])).toBe(false)
  })

  it('selects the latest proposal by revision before timestamp', () => {
    const proposal = latestProposal({
      proposals: [
        proposalFixture({
          id: 'older',
          revision: 1,
          createdAt: '2026-06-07T02:00:00.000Z',
        }),
        proposalFixture({
          id: 'newer-revision',
          revision: 2,
          createdAt: '2026-06-07T01:00:00.000Z',
        }),
      ],
    } as FabricGovernanceChannel)

    expect(proposal.id).toBe('newer-revision')
  })

  it('formats approval and readiness labels honestly', () => {
    expect(proposalApprovalLabel(proposalFixture())).toBe('1/2 approvals')
    expect(readinessSummary(null)).toMatchObject({
      label: 'Readiness not checked',
    })
    expect(readinessSummary(readinessFixture({ ready: true }))).toMatchObject({
      label: 'Ready',
      status: 'ready',
    })
    expect(
      readinessSummary(
        readinessFixture({
          ready: false,
          operatorExecution: 'operator_pending',
        }),
      ),
    ).toMatchObject({
      label: 'Operator pending',
    })
  })

  it('detects secret-like text before rendering curated evidence links', () => {
    expect(hasSecretLikeText('safe operator summary')).toBe(false)
    expect(hasSecretLikeText('-----BEGIN PRIVATE KEY-----')).toBe(true)
    expect(hasSecretLikeText('FABRIC_PRIVATE_KEY_PEM')).toBe(true)
  })

  it('labels UAT-B-003 as an accepted operator-assisted boundary', () => {
    const decision = fabricDecisionFixture({
      id: 'UAT-B-003',
      status: 'resolved_by_decision',
      operatorAssistedOnly: true,
      localSeedCanPass: true,
      liveEvidenceRequired: false,
      readAnchorRequired: false,
      supportingAdr: 'ADR-015',
    })

    expect(decisionStatusLabel(decision)).toBe('Accepted boundary')
    expect(decisionRiskLabel(decision)).toBe('Operator-assisted only')
    expect(decision.topologyMutationSupported).toBe(false)
    expect(decision.directFabricExecutionSupported).toBe(false)
  })

  it('labels UAT-B-004 as a live proof gate that rejects seeded proof', () => {
    const decision = fabricDecisionFixture({
      id: 'UAT-B-004',
      title: 'Real Fabric proof',
      status: 'resolved_by_live_gate',
      operatorAssistedOnly: false,
      localSeedCanPass: false,
      liveEvidenceRequired: true,
      readAnchorRequired: true,
      verificationTruthRule:
        'verified=true requires a successful ReadAnchor hash comparison.',
      supportingAdr: null,
    })

    expect(decisionStatusLabel(decision)).toBe('Live proof gate')
    expect(decisionRiskLabel(decision)).toBe('Seeded proof rejected')
    expect(decision.seededProofAccepted).toBe(false)
    expect(decision.verificationTruthRule).toContain('ReadAnchor')
  })

  it('summarizes direct Fabric automation readiness without claiming runtime support', () => {
    expect(automationReadinessSummary(null)).toMatchObject({
      label: 'Automation readiness not checked',
    })
    expect(
      automationReadinessSummary(
        automationReadinessFixture({ status: 'disabled' }),
      ),
    ).toMatchObject({
      label: 'Automation disabled',
      status: 'disabled',
    })
    expect(
      automationReadinessSummary(
        automationReadinessFixture({ status: 'blocked', enabled: true }),
      ),
    ).toMatchObject({
      label: 'Automation blocked',
      status: 'blocked',
    })
  })
})

function proposalFixture(
  overrides: Partial<FabricGovernanceChannel['proposals'][number]> = {},
): FabricGovernanceChannel['proposals'][number] {
  return {
    id: 'proposal-1',
    fabricChannelId: 'channel-1',
    proposalType: 'create_channel',
    revision: 1,
    status: 'pending_approval',
    proposalPayload: {},
    proposalDigest: 'digest',
    requiredApprovals: 2,
    receivedApprovals: 1,
    createdByUserId: 'user-1',
    approvals: [],
    evidence: [],
    createdAt: '2026-06-07T00:00:00.000Z',
    updatedAt: '2026-06-07T00:00:00.000Z',
    ...overrides,
  }
}

function readinessFixture(
  overrides: {
    ready?: boolean
    operatorExecution?: string
  } = {},
): FabricGovernanceReadiness {
  return {
    fabricChannelId: 'channel-1',
    channelName: 'audit-channel',
    status: overrides.ready ? 'active' : 'operator_pending',
    readinessStatus: overrides.ready ? 'ready' : 'operator_pending',
    ready: overrides.ready ?? false,
    governance: {
      requiredApprovals: 2,
      receivedApprovals: 2,
      latestProposalStatus: 'operator_pending',
      operatorExecution: overrides.operatorExecution ?? 'executed',
    },
    invitations: {
      total: 0,
      pending: 0,
      accepted: 0,
    },
    memberships: {
      total: 1,
      joined: overrides.ready ? 1 : 0,
      operatorPending: overrides.ready ? 0 : 1,
    },
    runtime: {
      mode: 'gateway',
      gatewayConfigured: true,
      chaincodeConfigured: true,
      configuredChannel: 'configured',
      configuredChaincode: 'configured',
      configuredForChannel: overrides.ready ?? false,
      missingGatewayConfig: [],
      limitations: [],
    },
    limitations: ['Channel topology is operator-executed outside the app.'],
  }
}

function fabricDecisionFixture(
  overrides: Partial<FabricUatBlockerDecision> = {},
): FabricUatBlockerDecision {
  return {
    id: 'UAT-B-003',
    title: 'Fabric topology mutation',
    status: 'resolved_by_decision',
    decision:
      'MEPN keeps Fabric topology mutation operator-assisted for this boundary.',
    implementedBoundary:
      'The app records governance metadata, approvals, readiness, and evidence.',
    topologyMutationSupported: false,
    directFabricExecutionSupported: false,
    operatorAssistedOnly: true,
    localSeedCanPass: true,
    seededProofAccepted: false,
    liveEvidenceRequired: false,
    readAnchorRequired: false,
    verificationTruthRule:
      'Local UAT proves the boundary and not direct channel creation.',
    acceptedAdr: 'ADR-016',
    supportingAdr: 'ADR-015',
    evidencePath: 'docs/evidence/uat/USE_CASE_BLOCKERS.md#uat-b-003',
    nextAction: 'Use operator-assisted governance.',
    ...overrides,
  }
}

function automationReadinessFixture(
  overrides: Partial<FabricTopologyAutomationReadiness> = {},
): FabricTopologyAutomationReadiness {
  return {
    enabled: false,
    status: 'disabled',
    executionMode: 'not_enabled',
    checkedAt: '2026-06-07T00:00:00.000Z',
    requirements: [],
    missingRequirementIds: ['automation-adr-approved'],
    limitations: ['Direct Fabric topology execution is disabled by default.'],
    nextActions: ['Approve a direct automation ADR first.'],
    ...overrides,
  }
}
