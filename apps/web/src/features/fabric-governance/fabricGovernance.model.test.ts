import { describe, expect, it } from 'vitest'

import {
  canCreateFabricGovernanceProposal,
  canOperateFabricGovernance,
  hasSecretLikeText,
  latestProposal,
  proposalApprovalLabel,
  readinessSummary,
} from './fabricGovernance.model'
import type {
  FabricGovernanceChannel,
  FabricGovernanceReadiness,
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
