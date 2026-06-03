import { describe, expect, it } from 'vitest'

import {
  canAccessRoute,
  getVisibleSidebarRoutes,
} from './authorization'
import { matchRouteMetadata, routeMetadata } from './navigation'
import {
  anonymousSession,
  readyAuthorization,
  signedInSession,
} from '../test/fixtures/sessions'

function route(path: string) {
  const metadata = matchRouteMetadata(path)

  if (!metadata) {
    throw new Error(`Missing route metadata for ${path}`)
  }

  return metadata
}

function visibleLabelsFor(
  roleCodes: Parameters<typeof readyAuthorization>[0],
  permissionCodes: Parameters<typeof readyAuthorization>[1],
) {
  return getVisibleSidebarRoutes(
    routeMetadata,
    signedInSession,
    readyAuthorization(roleCodes, permissionCodes),
  ).map((item) => item.label)
}

describe('route authorization', () => {
  it('blocks anonymous direct access to the dashboard', () => {
    expect(
      canAccessRoute(
        route('/dashboard'),
        anonymousSession,
        { status: 'anonymous', roleCodes: [], permissionCodes: [] },
      ),
    ).toBe(false)
  })

  it('keeps bootstrap organization setup available without a session', () => {
    expect(
      canAccessRoute(
        route('/org/setup'),
        anonymousSession,
        { status: 'anonymous', roleCodes: [], permissionCodes: [] },
      ),
    ).toBe(true)
  })

  it('does not show sidebar routes until authorization is ready', () => {
    expect(
      getVisibleSidebarRoutes(
        routeMetadata,
        anonymousSession,
        { status: 'anonymous', roleCodes: [], permissionCodes: [] },
      ),
    ).toEqual([])
  })

  it('prefers exact routes before dynamic route matches', () => {
    expect(matchRouteMetadata('/procurement/requisitions/new')?.label).toBe(
      'New requisition',
    )
  })

  it('shows administration routes to organization admins', () => {
    const labels = visibleLabelsFor(
      ['ORG_ADMIN'],
      [
        'users:create',
        'procurement:create',
        'procurement:approve',
        'finance:review',
        'audit:read',
      ],
    )

    expect(labels).toContain('Dashboard')
    expect(labels).toContain('Users')
    expect(labels).toContain('Roles')
    expect(labels).toContain('Audit Events')
    expect(labels).toContain('Reports')
  })

  it('hides admin and finance opportunity routes from procurement officers', () => {
    const labels = visibleLabelsFor(
      ['PROCUREMENT_OFFICER'],
      ['procurement:create'],
    )

    expect(labels).toContain('Requisitions')
    expect(labels).toContain('RFQs')
    expect(labels).not.toContain('Finance Opportunities')
    expect(labels).not.toContain('Users')
    expect(labels).not.toContain('Roles')
    expect(labels).not.toContain('Reports')
  })

  it('shows finance review routes to financier users', () => {
    const labels = visibleLabelsFor(
      ['FINANCIER_USER'],
      ['finance:review', 'audit:read'],
    )

    expect(labels).toContain('Finance Opportunities')
    expect(labels).toContain('Applications')
    expect(labels).toContain('Ledgers')
    expect(labels).toContain('Reports')
  })

  it('keeps Shariah reviewers in application and contract workspaces', () => {
    const labels = visibleLabelsFor(['SHARIAH_REVIEWER'], ['shariah:review'])

    expect(labels).toContain('Applications')
    expect(labels).toContain('Contract Terms')
    expect(labels).not.toContain('Finance Opportunities')
  })

  it('shows verification surfaces to auditors without procurement write routes', () => {
    const labels = visibleLabelsFor(['AUDITOR'], ['audit:read'])

    expect(labels).toContain('Evidence Packs')
    expect(labels).toContain('Hash Verification')
    expect(labels).toContain('Audit Events')
    expect(labels).toContain('Reports')
    expect(labels).not.toContain('Suppliers')
  })
})
