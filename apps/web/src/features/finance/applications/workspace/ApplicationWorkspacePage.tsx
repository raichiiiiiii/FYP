import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { PageHeader } from '../../../../layouts/PageHeader'
import { AccessDenied } from '../../../../shared/components/AccessDenied'
import { EmptyState } from '../../../../shared/components/EmptyState'
import { ErrorState } from '../../../../shared/components/ErrorState'
import { LoadingState } from '../../../../shared/components/LoadingState'
import type { AppRoleCode, AppSession, LoadState } from '../../../../shared/types'
import { useApplications } from '../../api/useApplications'
import {
  buildWorkspaceRoleProfile,
  canViewWorkspaceTab,
  mapApplicationWorkspace,
  normalizeWorkspaceTab,
} from './applicationWorkspace.model'
import { ApplicationOverviewPanel } from './ApplicationOverviewPanel'
import { ApplicationTimeline } from './ApplicationTimeline'
import { ApplicationWorkspaceTabs } from './ApplicationWorkspaceTabs'
import type {
  ApplicationWorkspace,
  ApplicationWorkspaceRawDto,
  WorkspaceTabId,
} from './applicationWorkspace.types'

export function ApplicationWorkspacePage({
  applicationId,
  workspaceTab,
  roleCodes,
  session,
}: {
  applicationId: string
  workspaceTab?: string
  roleCodes: AppRoleCode[]
  session: AppSession
}) {
  const { getApplication } = useApplications(session)
  const selectedTab = normalizeWorkspaceTab(workspaceTab)
  const roleProfile = useMemo(
    () => buildWorkspaceRoleProfile(roleCodes),
    [roleCodes],
  )
  const [state, setState] = useState<LoadState<ApplicationWorkspace>>({
    status: 'loading',
  })

  const loadWorkspace = useCallback(async () => {
    const application = await getApplication<ApplicationWorkspaceRawDto>(
      applicationId,
    )

    return mapApplicationWorkspace(application)
  }, [applicationId, getApplication])

  useEffect(() => {
    let cancelled = false

    loadWorkspace()
      .then((workspace) => {
        if (!cancelled) {
          setState({ status: 'ready', data: workspace })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load application workspace',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadWorkspace])

  if (!roleProfile.canViewWorkspace) {
    return <AccessDenied />
  }

  if (!canViewWorkspaceTab(selectedTab, roleCodes)) {
    return (
      <>
        <PageHeader eyebrow="Mudarabah workspace" title="Access denied" />
        <ApplicationWorkspaceTabs
          applicationId={applicationId}
          selectedTab={selectedTab}
          roleCodes={roleCodes}
        />
        <AccessDenied />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Mudarabah workspace"
        title="Application workspace"
        action={
          <NavLink className="button button--secondary" to="/finance/applications">
            Back to pipeline
          </NavLink>
        }
      />
      <ApplicationWorkspaceTabs
        applicationId={applicationId}
        selectedTab={selectedTab}
        roleCodes={roleCodes}
      />

      {state.status === 'loading' ? (
        <LoadingState message="Loading application workspace..." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState
          title="Unable to load application workspace"
          message={state.message}
        />
      ) : null}
      {state.status === 'ready' ? (
        <WorkspaceContent
          workspace={state.data}
          selectedTab={selectedTab}
          roleCodes={roleCodes}
        />
      ) : null}
    </>
  )
}

function WorkspaceContent({
  workspace,
  selectedTab,
  roleCodes,
}: {
  workspace: ApplicationWorkspace
  selectedTab: WorkspaceTabId
  roleCodes: AppRoleCode[]
}) {
  return (
    <div className="workspace-layout">
      <ApplicationOverviewPanel workspace={workspace} roleCodes={roleCodes} />
      <ApplicationTimeline status={workspace.status} />
      {selectedTab === 'overview' ? null : (
        <EmptyState title="Workspace section shell ready">
          This tab is route-backed and permission-aware. Its mutation-heavy
          workflow is intentionally deferred to the next Slice 4 sub-slices.
        </EmptyState>
      )}
    </div>
  )
}
