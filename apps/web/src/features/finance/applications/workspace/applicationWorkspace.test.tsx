import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import {
  buildWorkspaceActions,
  getLifecycleSteps,
  mapApplicationWorkspace,
} from './applicationWorkspace.model'
import { applicationWorkspaceFixture } from './applicationWorkspace.fixtures'
import { ApplicationOverviewPanel } from './ApplicationOverviewPanel'
import { ApplicationWorkspaceTabs } from './ApplicationWorkspaceTabs'
import { LossExceptionPanel } from './LossExceptionPanel'

describe('application workspace shell', () => {
  it('renders role-visible tabs and disabled unavailable tabs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ApplicationWorkspaceTabs
          applicationId="app-001"
          selectedTab="overview"
          roleCodes={['SHARIAH_REVIEWER']}
        />
      </MemoryRouter>,
    )

    expect(html).toContain('Overview')
    expect(html).toContain('Shariah Review')
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('Due Diligence')
  })

  it('normalizes workspace data and shows the current lifecycle step', () => {
    const workspace = mapApplicationWorkspace(applicationWorkspaceFixture)
    const timeline = getLifecycleSteps(workspace.status)

    expect(workspace.status).toBe('due_diligence')
    expect(workspace.evidence).toHaveLength(2)
    expect(workspace.lossExceptions).toHaveLength(1)
    expect(workspace.closureBlockedByLossException).toBe(true)
    expect(timeline.find((step) => step.state === 'current')?.id).toBe(
      'due_diligence',
    )
  })

  it('shows financier actions as read-only in Slice 4A/4B', () => {
    const workspace = mapApplicationWorkspace(applicationWorkspaceFixture)
    const actions = buildWorkspaceActions(workspace, ['FINANCIER_USER'])

    expect(actions.some((action) => action.id === 'record-due-diligence')).toBe(
      true,
    )
    expect(actions.every((action) => action.enabled === false)).toBe(true)
  })

  it('does not render financier decision actions for procurement-only users', () => {
    const workspace = mapApplicationWorkspace(applicationWorkspaceFixture)
    const html = renderToStaticMarkup(
      <ApplicationOverviewPanel
        workspace={workspace}
        roleCodes={['PROCUREMENT_OFFICER']}
      />,
    )

    expect(html).toContain('Submit evidence')
    expect(html).not.toContain('Record due diligence')
    expect(html).toContain('Read-only')
  })

  it('renders reviewer loss-exception workflow without claiming fixed returns', () => {
    const queryClient = new QueryClient()
    const workspace = mapApplicationWorkspace(applicationWorkspaceFixture)
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <LossExceptionPanel
          workspace={workspace}
          roleCodes={['SHARIAH_REVIEWER']}
          session={{
            organizationId: 'org-1',
            actorUserId: 'reviewer-1',
          }}
          onRefresh={async () => undefined}
        />
      </QueryClientProvider>,
    )

    expect(html).toContain('Closure blocked')
    expect(html).toContain('Genuine commercial loss')
    expect(html).toContain('Start evidence review')
    expect(html).toContain('does not create a guaranteed or fixed return')
  })
})
