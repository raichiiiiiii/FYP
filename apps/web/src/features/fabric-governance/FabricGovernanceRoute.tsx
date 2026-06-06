import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '../../layouts/PageHeader'
import { apiRequest } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { getErrorMessage } from '../../shared/api/errors'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { Field } from '../../shared/components/Field'
import { LoadingState } from '../../shared/components/LoadingState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppSession, LoadState } from '../../shared/types'
import { formatDateTime } from '../../shared/utils/formatting'
import {
  canCreateFabricGovernanceProposal,
  canOperateFabricGovernance,
  latestProposal,
  proposalApprovalLabel,
  readinessSummary,
} from './fabricGovernance.model'
import type {
  FabricGovernanceChannel,
  FabricGovernanceProposal,
  FabricGovernanceReadiness,
} from './fabricGovernance.types'

type NoticeState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

type ChannelForm = {
  networkName: string
  channelName: string
  chaincodeName: string
  mspId: string
  invitedEmail: string
  invitedMspId: string
}

type InvitationForm = {
  invitedOrganizationId: string
  invitedEmail: string
  invitedMspId: string
}

type EvidenceForm = {
  operatorSummary: string
  contentHash: string
  storageUri: string
}

const defaultChannelForm: ChannelForm = {
  networkName: 'MEPN Local Fabric Network',
  channelName: '',
  chaincodeName: 'audit-anchor',
  mspId: '',
  invitedEmail: '',
  invitedMspId: '',
}

const defaultInvitationForm: InvitationForm = {
  invitedOrganizationId: '',
  invitedEmail: '',
  invitedMspId: '',
}

const defaultEvidenceForm: EvidenceForm = {
  operatorSummary: 'Operator completed channel governance action outside MEPN.',
  contentHash: '',
  storageUri: '',
}

export function FabricGovernanceRoute({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: string[]
}) {
  const [channelsState, setChannelsState] = useState<
    LoadState<FabricGovernanceChannel[]>
  >({ status: 'loading' })
  const [readinessState, setReadinessState] = useState<
    LoadState<FabricGovernanceReadiness | null>
  >({ status: 'ready', data: null })
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [channelForm, setChannelForm] =
    useState<ChannelForm>(defaultChannelForm)
  const [invitationForm, setInvitationForm] = useState<InvitationForm>(
    defaultInvitationForm,
  )
  const [evidenceForm, setEvidenceForm] =
    useState<EvidenceForm>(defaultEvidenceForm)
  const [notice, setNotice] = useState<NoticeState>({ status: 'idle' })

  const canCreate = canCreateFabricGovernanceProposal(roleCodes)
  const canOperate = canOperateFabricGovernance(roleCodes)

  const loadChannels = useCallback(async () => {
    if (!session.organizationId || !session.actorUserId) {
      throw new Error('Active organization and user context are required')
    }

    return apiRequest<FabricGovernanceChannel[]>(
      endpoints.fabricGovernance.channels(
        session.organizationId,
        session.actorUserId,
      ),
    )
  }, [session.actorUserId, session.organizationId])

  const refreshChannels = useCallback(() => {
    setChannelsState({ status: 'loading' })

    loadChannels()
      .then((channels) => {
        setChannelsState({ status: 'ready', data: channels })
        setSelectedChannelId((current) => current ?? channels[0]?.id ?? null)
      })
      .catch((error: unknown) => {
        setChannelsState({
          status: 'error',
          message: getErrorMessage(
            error,
            'Unable to load Fabric governance channels',
          ),
        })
      })
  }, [loadChannels])

  useEffect(() => {
    let cancelled = false

    loadChannels()
      .then((channels) => {
        if (!cancelled) {
          setChannelsState({ status: 'ready', data: channels })
          setSelectedChannelId((current) => current ?? channels[0]?.id ?? null)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setChannelsState({
            status: 'error',
            message: getErrorMessage(
              error,
              'Unable to load Fabric governance channels',
            ),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadChannels])

  const channels = useMemo(
    () => (channelsState.status === 'ready' ? channelsState.data : []),
    [channelsState],
  )
  const selectedChannel = useMemo(
    () =>
      selectedChannelId
        ? channels.find((channel) => channel.id === selectedChannelId) ?? null
        : channels[0] ?? null,
    [channels, selectedChannelId],
  )
  const selectedProposal = selectedChannel
    ? latestProposal(selectedChannel)
    : null
  const summary =
    readinessState.status === 'ready'
      ? readinessSummary(readinessState.data)
      : readinessSummary(null)

  const loadReadiness = useCallback(async () => {
    if (!selectedChannel || !session.organizationId || !session.actorUserId) {
      setReadinessState({ status: 'ready', data: null })
      return
    }

    setReadinessState({ status: 'loading' })

    try {
      const readiness = await apiRequest<FabricGovernanceReadiness>(
        endpoints.fabricGovernance.readiness(
          selectedChannel.id,
          session.organizationId,
          session.actorUserId,
        ),
      )
      setReadinessState({ status: 'ready', data: readiness })
    } catch (error) {
      setReadinessState({
        status: 'error',
        message: getErrorMessage(error, 'Unable to load channel readiness'),
      })
    }
  }, [selectedChannel, session.actorUserId, session.organizationId])

  useEffect(() => {
    let cancelled = false

    Promise.resolve()
      .then(async () => {
        if (!selectedChannel || !session.organizationId || !session.actorUserId) {
          return null
        }

        if (!cancelled) {
          setReadinessState({ status: 'loading' })
        }

        return apiRequest<FabricGovernanceReadiness>(
          endpoints.fabricGovernance.readiness(
            selectedChannel.id,
            session.organizationId,
            session.actorUserId,
          ),
        )
      })
      .then((readiness) => {
        if (cancelled) {
          return
        }

        setReadinessState({ status: 'ready', data: readiness })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setReadinessState({
            status: 'error',
            message: getErrorMessage(error, 'Unable to load channel readiness'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedChannel, session.actorUserId, session.organizationId])

  async function submitChannelProposal() {
    if (!session.organizationId || !session.actorUserId) {
      setNotice({
        status: 'error',
        message: 'Active organization and user context are required.',
      })
      return
    }

    if (!channelForm.channelName.trim()) {
      setNotice({ status: 'error', message: 'Channel name is required.' })
      return
    }

    await runAction(
      () =>
        apiRequest<FabricGovernanceChannel>(
          endpoints.fabricGovernance.createChannel,
          {
            method: 'POST',
            body: {
              organizationId: session.organizationId,
              actorUserId: session.actorUserId,
              networkName: channelForm.networkName,
              channelName: channelForm.channelName,
              chaincodeName: channelForm.chaincodeName,
              mspId: channelForm.mspId,
              invitedEmail: channelForm.invitedEmail || undefined,
              invitedMspId: channelForm.invitedMspId || undefined,
            },
          },
        ),
      'Fabric channel governance proposal created. Operator execution is still required.',
    )
    setChannelForm(defaultChannelForm)
  }

  async function createInvitation() {
    if (!selectedChannel || !session.organizationId || !session.actorUserId) {
      return
    }

    if (
      !invitationForm.invitedOrganizationId.trim() &&
      !invitationForm.invitedEmail.trim()
    ) {
      setNotice({
        status: 'error',
        message: 'Invited organization ID or email is required.',
      })
      return
    }

    await runAction(
      () =>
        apiRequest(
          endpoints.fabricGovernance.createInvitation(selectedChannel.id),
          {
            method: 'POST',
            body: {
              organizationId: session.organizationId,
              actorUserId: session.actorUserId,
              invitedOrganizationId:
                invitationForm.invitedOrganizationId || undefined,
              invitedEmail: invitationForm.invitedEmail || undefined,
              invitedMspId: invitationForm.invitedMspId || undefined,
            },
          },
        ),
      'Fabric channel invitation recorded.',
    )
    setInvitationForm(defaultInvitationForm)
  }

  async function approveProposal(proposal: FabricGovernanceProposal) {
    if (!session.organizationId || !session.actorUserId) {
      return
    }

    await runAction(
      () =>
        apiRequest(endpoints.fabricGovernance.approveProposal(proposal.id), {
          method: 'POST',
          body: {
            organizationId: session.organizationId,
            actorUserId: session.actorUserId,
            rationale: 'Approved from Fabric governance workspace.',
          },
        }),
      'Governance approval recorded.',
    )
  }

  async function recordOperatorExecution(proposal: FabricGovernanceProposal) {
    if (!session.organizationId || !session.actorUserId) {
      return
    }

    await runAction(
      () =>
        apiRequest(
          endpoints.fabricGovernance.operatorExecution(proposal.id),
          {
            method: 'POST',
            body: {
              organizationId: session.organizationId,
              actorUserId: session.actorUserId,
              evidenceType: 'operator_command_summary',
              operatorSummary: evidenceForm.operatorSummary,
              contentHash: evidenceForm.contentHash || undefined,
              storageUri: evidenceForm.storageUri || undefined,
              metadata: {
                source: 'fabric-governance-ui',
                sanitized: true,
              },
            },
          },
        ),
      'Operator execution evidence recorded.',
    )
  }

  async function recordOperatorFailure(proposal: FabricGovernanceProposal) {
    if (!session.organizationId || !session.actorUserId) {
      return
    }

    await runAction(
      () =>
        apiRequest(endpoints.fabricGovernance.operatorFailure(proposal.id), {
          method: 'POST',
          body: {
            organizationId: session.organizationId,
            actorUserId: session.actorUserId,
            failureReason: evidenceForm.operatorSummary,
            evidenceType: 'error_log_summary',
            operatorSummary: evidenceForm.operatorSummary,
            contentHash: evidenceForm.contentHash || undefined,
            storageUri: evidenceForm.storageUri || undefined,
            metadata: {
              source: 'fabric-governance-ui',
              sanitized: true,
            },
          },
        }),
      'Operator failure evidence recorded.',
    )
  }

  async function runAction(
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    setNotice({ status: 'idle' })

    try {
      await action()
      setNotice({ status: 'success', message: successMessage })
      refreshChannels()
      await loadReadiness()
    } catch (error) {
      setNotice({
        status: 'error',
        message: getErrorMessage(error, 'Fabric governance action failed'),
      })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Fabric governance"
        title="Operator-assisted channel governance"
      />

      <section className="fabric-governance-hero">
        <div>
          <span>Consortium boundary</span>
          <h2>MEPN records proposals, approvals, invitations, and evidence.</h2>
          <p>
            This workspace does not create Fabric channels, join peers, enroll
            MSP identities, or sign channel config updates. A platform operator
            executes topology changes outside the app and records sanitized
            evidence here.
          </p>
        </div>
        <article>
          <span>Authority model</span>
          <strong>Operator execution required</strong>
          <p>
            Organization admins can initiate governance workflow. Fabric
            governance admins approve consortium changes. Platform operators
            record execution or failure evidence.
          </p>
        </article>
      </section>

      {channelsState.status === 'loading' ? (
        <LoadingState message="Loading Fabric governance workspace..." />
      ) : null}
      {channelsState.status === 'error' ? (
        <ErrorState
          title="Unable to load Fabric governance"
          message={channelsState.message}
        />
      ) : null}

      {notice.status === 'success' ? (
        <p className="notice">{notice.message}</p>
      ) : null}
      {notice.status === 'error' ? (
        <p className="error-text">{notice.message}</p>
      ) : null}

      <section className="fabric-governance-grid">
        {canCreate ? (
          <section className="form-grid fabric-governance-panel">
            <h2>Create channel proposal</h2>
            <p>
              Creates channel metadata and a governance proposal only. No Fabric
              topology mutation is attempted by this form.
            </p>
            <Field
              label="Network name"
              name="fabricNetworkName"
              value={channelForm.networkName}
              onChange={(value) =>
                setChannelForm((current) => ({
                  ...current,
                  networkName: value,
                }))
              }
            />
            <Field
              label="Channel name"
              name="fabricChannelName"
              required
              value={channelForm.channelName}
              onChange={(value) =>
                setChannelForm((current) => ({
                  ...current,
                  channelName: value,
                }))
              }
            />
            <Field
              label="Chaincode name"
              name="fabricChaincodeName"
              value={channelForm.chaincodeName}
              onChange={(value) =>
                setChannelForm((current) => ({
                  ...current,
                  chaincodeName: value,
                }))
              }
            />
            <Field
              label="Requesting MSP ID"
              name="fabricMspId"
              value={channelForm.mspId}
              onChange={(value) =>
                setChannelForm((current) => ({ ...current, mspId: value }))
              }
            />
            <Field
              label="Optional invited email"
              name="fabricInvitedEmail"
              value={channelForm.invitedEmail}
              onChange={(value) =>
                setChannelForm((current) => ({
                  ...current,
                  invitedEmail: value,
                }))
              }
            />
            <Field
              label="Optional invited MSP ID"
              name="fabricInvitedMspId"
              value={channelForm.invitedMspId}
              onChange={(value) =>
                setChannelForm((current) => ({
                  ...current,
                  invitedMspId: value,
                }))
              }
            />
            <button type="button" onClick={submitChannelProposal}>
              Create proposal
            </button>
          </section>
        ) : (
          <EmptyState title="Read-only governance view">
            This role can inspect Fabric governance status, but cannot initiate
            or approve channel changes.
          </EmptyState>
        )}

        <section className="fabric-governance-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Channel registry</span>
              <h2>Known Fabric channels</h2>
            </div>
          </div>
          {channels.length ? (
            <div className="fabric-channel-list">
              {channels.map((channel) => {
                const proposal = latestProposal(channel)
                const selected = selectedChannel?.id === channel.id

                return (
                  <button
                    className={
                      selected
                        ? 'fabric-channel-card fabric-channel-card--active'
                        : 'fabric-channel-card'
                    }
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannelId(channel.id)}
                  >
                    <span>{channel.channelName}</span>
                    <strong>{channel.chaincodeName || 'No chaincode set'}</strong>
                    <small>{proposalApprovalLabel(proposal)}</small>
                    <StatusBadge status={channel.status} />
                  </button>
                )
              })}
            </div>
          ) : (
            <EmptyState>No Fabric governance channels are registered yet.</EmptyState>
          )}
        </section>
      </section>

      {selectedChannel ? (
        <section className="fabric-governance-detail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Selected channel</span>
              <h2>{selectedChannel.channelName}</h2>
            </div>
            <StatusBadge status={selectedChannel.status} />
          </div>

          <section className="details-grid integration-summary-grid">
            <article>
              <span>Readiness</span>
              <strong>{summary.label}</strong>
              <p>{summary.helper}</p>
            </article>
            <article>
              <span>Proposal</span>
              <strong>{selectedProposal?.proposalType ?? 'None'}</strong>
              <p>{proposalApprovalLabel(selectedProposal)}</p>
            </article>
            <article>
              <span>Operator execution</span>
              <strong>
                {readinessState.status === 'ready' && readinessState.data
                  ? readinessState.data.governance.operatorExecution
                  : 'not checked'}
              </strong>
            </article>
            <article>
              <span>Runtime match</span>
              <strong>
                {readinessState.status === 'ready' &&
                readinessState.data?.runtime.configuredForChannel
                  ? 'Configured for channel'
                  : 'Not configured for channel'}
              </strong>
            </article>
          </section>

          {readinessState.status === 'loading' ? (
            <LoadingState message="Checking channel readiness..." />
          ) : null}
          {readinessState.status === 'error' ? (
            <ErrorState
              title="Readiness check failed"
              message={readinessState.message}
            />
          ) : null}
          {readinessState.status === 'ready' && readinessState.data ? (
            <section className="fabric-governance-limitations">
              <h3>Readiness notes</h3>
              <ul>
                {readinessState.data.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="fabric-governance-grid">
            <section className="fabric-governance-panel">
              <h2>Invitations and memberships</h2>
              <div className="fabric-governance-list">
                {selectedChannel.memberships.map((membership) => (
                  <article key={membership.id}>
                    <span>{membership.organizationName ?? membership.organizationId}</span>
                    <strong>{membership.mspId || 'MSP pending'}</strong>
                    <StatusBadge status={membership.membershipStatus} />
                  </article>
                ))}
              </div>
              {selectedChannel.invitations.length ? (
                <div className="fabric-governance-list">
                  {selectedChannel.invitations.map((invitation) => (
                    <article key={invitation.id}>
                      <span>
                        {invitation.invitedOrganizationName ??
                          invitation.invitedEmail ??
                          invitation.invitedOrganizationId ??
                          'Invitation'}
                      </span>
                      <strong>{invitation.invitedMspId || 'MSP pending'}</strong>
                      <StatusBadge status={invitation.status} />
                    </article>
                  ))}
                </div>
              ) : null}
              {canCreate ? (
                <div className="fabric-governance-subform">
                  <Field
                    label="Invited organization ID"
                    name="fabricInvitationOrg"
                    value={invitationForm.invitedOrganizationId}
                    onChange={(value) =>
                      setInvitationForm((current) => ({
                        ...current,
                        invitedOrganizationId: value,
                      }))
                    }
                  />
                  <Field
                    label="Invited email"
                    name="fabricInvitationEmail"
                    value={invitationForm.invitedEmail}
                    onChange={(value) =>
                      setInvitationForm((current) => ({
                        ...current,
                        invitedEmail: value,
                      }))
                    }
                  />
                  <Field
                    label="Invited MSP ID"
                    name="fabricInvitationMsp"
                    value={invitationForm.invitedMspId}
                    onChange={(value) =>
                      setInvitationForm((current) => ({
                        ...current,
                        invitedMspId: value,
                      }))
                    }
                  />
                  <button type="button" onClick={createInvitation}>
                    Record invitation
                  </button>
                </div>
              ) : null}
            </section>

            <section className="fabric-governance-panel">
              <h2>Proposal approvals and evidence</h2>
              {selectedProposal ? (
                <>
                  <div className="fabric-governance-proposal">
                    <span>Revision {selectedProposal.revision}</span>
                    <strong>{selectedProposal.proposalDigest}</strong>
                    <StatusBadge status={selectedProposal.status} />
                    <p>{proposalApprovalLabel(selectedProposal)}</p>
                  </div>
                  {selectedProposal.approvals.length ? (
                    <div className="fabric-governance-list">
                      {selectedProposal.approvals.map((approval) => (
                        <article key={approval.id}>
                          <span>{approval.roleCode}</span>
                          <strong>{approval.decision}</strong>
                          <small>{formatDateTime(approval.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState>No approvals have been recorded yet.</EmptyState>
                  )}
                  <div className="fabric-governance-actions">
                    {canCreate ? (
                      <button
                        type="button"
                        onClick={() => approveProposal(selectedProposal)}
                      >
                        Approve proposal
                      </button>
                    ) : null}
                    {canOperate ? (
                      <>
                        <Field
                          label="Operator summary"
                          name="fabricOperatorSummary"
                          value={evidenceForm.operatorSummary}
                          onChange={(value) =>
                            setEvidenceForm((current) => ({
                              ...current,
                              operatorSummary: value,
                            }))
                          }
                        />
                        <Field
                          label="Evidence content hash"
                          name="fabricEvidenceHash"
                          value={evidenceForm.contentHash}
                          onChange={(value) =>
                            setEvidenceForm((current) => ({
                              ...current,
                              contentHash: value,
                            }))
                          }
                        />
                        <Field
                          label="Evidence URI"
                          name="fabricEvidenceUri"
                          value={evidenceForm.storageUri}
                          onChange={(value) =>
                            setEvidenceForm((current) => ({
                              ...current,
                              storageUri: value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            recordOperatorExecution(selectedProposal)
                          }
                        >
                          Record execution
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            recordOperatorFailure(selectedProposal)
                          }
                        >
                          Record failure
                        </button>
                      </>
                    ) : null}
                  </div>
                  {selectedProposal.evidence.length ? (
                    <div className="fabric-governance-list">
                      {selectedProposal.evidence.map((evidence) => (
                        <article key={evidence.id}>
                          <span>{evidence.evidenceType}</span>
                          <strong>{evidence.contentHash || 'No hash recorded'}</strong>
                          <small>{formatDateTime(evidence.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState>No governance proposal exists for this channel.</EmptyState>
              )}
            </section>
          </section>
        </section>
      ) : null}
    </>
  )
}
