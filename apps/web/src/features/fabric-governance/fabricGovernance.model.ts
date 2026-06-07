import type { AppRoleCode } from '../../shared/types'
import type {
  FabricGovernanceChannel,
  FabricGovernanceProposal,
  FabricGovernanceReadiness,
  FabricTopologyAutomationReadiness,
  FabricUatBlockerDecision,
} from './fabricGovernance.types'

export function canCreateFabricGovernanceProposal(roleCodes: readonly string[]) {
  return roleCodes.some((roleCode) =>
    ['ORG_ADMIN', 'FABRIC_GOVERNANCE_ADMIN', 'PLATFORM_OPERATOR'].includes(
      roleCode,
    ),
  )
}

export function canOperateFabricGovernance(roleCodes: readonly string[]) {
  return roleCodes.includes('PLATFORM_OPERATOR')
}

export function canReadFabricGovernance(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) =>
    [
      'ORG_ADMIN',
      'FABRIC_GOVERNANCE_ADMIN',
      'PLATFORM_OPERATOR',
      'AUDITOR',
    ].includes(roleCode),
  )
}

export function latestProposal(channel: FabricGovernanceChannel) {
  return [...channel.proposals].sort((left, right) => {
    if (left.revision !== right.revision) {
      return right.revision - left.revision
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt)
  })[0]
}

export function proposalApprovalLabel(
  proposal?: FabricGovernanceProposal | null,
) {
  if (!proposal) {
    return 'No proposal'
  }

  return `${proposal.receivedApprovals}/${proposal.requiredApprovals} approvals`
}

export function readinessSummary(readiness?: FabricGovernanceReadiness | null) {
  if (!readiness) {
    return {
      label: 'Readiness not checked',
      status: 'pending',
      helper:
        'Open a channel to run the metadata, approval, and runtime readiness check.',
    }
  }

  if (readiness.ready) {
    return {
      label: 'Ready',
      status: 'ready',
      helper:
        'Governance execution is recorded and the current Gateway runtime matches this channel.',
    }
  }

  if (readiness.governance.operatorExecution === 'failed') {
    return {
      label: 'Operator failed',
      status: 'failed',
      helper: 'Operator execution was recorded as failed. Create a new revision.',
    }
  }

  if (readiness.governance.operatorExecution !== 'executed') {
    return {
      label: 'Operator pending',
      status: 'operator_pending',
      helper:
        'Approvals and sanitized operator execution evidence are required before this can be ready.',
    }
  }

  return {
    label: 'Runtime check required',
    status: 'runtime_check_required',
    helper:
      'Operator execution is recorded, but this API runtime is not configured for the channel.',
  }
}

export function decisionStatusLabel(decision: FabricUatBlockerDecision) {
  if (decision.status === 'resolved_by_live_gate') {
    return 'Live proof gate'
  }

  return 'Accepted boundary'
}

export function decisionRiskLabel(decision: FabricUatBlockerDecision) {
  if (decision.id === 'UAT-B-004' && decision.readAnchorRequired) {
    return 'Seeded proof rejected'
  }

  if (
    decision.id === 'UAT-B-003' &&
    decision.topologyMutationSupported === false
  ) {
    return 'Operator-assisted only'
  }

  return 'Boundary recorded'
}

export function automationReadinessSummary(
  readiness?: FabricTopologyAutomationReadiness | null,
) {
  if (!readiness) {
    return {
      label: 'Automation readiness not checked',
      status: 'pending',
      helper:
        'The reviewer decision endpoint has not loaded direct topology automation readiness yet.',
    }
  }

  if (readiness.status === 'ready') {
    return {
      label: 'Gated operator-agent ready',
      status: 'ready',
      helper:
        'All direct topology automation requirements are configured for gated real-Fabric tests only.',
    }
  }

  if (readiness.status === 'blocked') {
    return {
      label: 'Automation blocked',
      status: 'blocked',
      helper:
        'Direct topology execution is enabled but required decisions or operator-agent settings are missing.',
    }
  }

  return {
    label: 'Automation disabled',
    status: 'disabled',
    helper:
      'Direct Fabric topology execution is disabled. Operator-assisted governance remains the supported path.',
  }
}

export function hasSecretLikeText(value: string) {
  return [
    'BEGIN PRIVATE KEY',
    'BEGIN CERTIFICATE',
    'FABRIC_PRIVATE_KEY_PEM',
    'AZURE_VM_SSH_KEY',
    'key.pem',
    'cert.pem',
    'password=',
    'token=',
  ].some((needle) => value.toLowerCase().includes(needle.toLowerCase()))
}
