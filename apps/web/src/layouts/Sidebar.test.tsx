import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthorizationState } from '../app/authorization'
import { routeMetadata } from '../app/navigation'
import type { AppSession } from '../shared/types'
import {
  getActiveSidebarModule,
  groupSidebarRoutesByModule,
} from './sidebarNavigation'
import { Sidebar } from './Sidebar'

const mockSessionState = vi.hoisted(() => ({
  session: {
    organizationId: 'org_123',
    actorUserId: 'user_123',
  },
  authorization: {
    status: 'ready',
    roleCodes: ['ORG_ADMIN'],
    permissionCodes: [
      'users:create',
      'procurement:create',
      'procurement:approve',
      'finance:review',
      'audit:read',
    ],
  },
}))

vi.mock('../app/session', () => ({
  useAppSession: () => ({
    session: mockSessionState.session as AppSession,
    authorization: mockSessionState.authorization as AuthorizationState,
    configureSession: () => undefined,
  }),
}))

vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({
    authSession: {
      userId: 'user_123',
      email: 'admin@example.test',
      displayName: 'Admin User',
      profileImageUrl: '/mock/example-sme-logo.png',
      organizationId: 'org_123',
      roleCodes: ['ORG_ADMIN'],
      permissionCodes: ['users:create'],
      workspaceScopes: [],
      expiresAt: '2026-06-07T00:00:00.000Z',
      authMode: 'dev',
      devAuthEnabled: true,
      oidcEnabled: false,
    },
    logout: () => undefined,
  }),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    mockSessionState.session = {
      organizationId: 'org_123',
      actorUserId: 'user_123',
    }
    mockSessionState.authorization = {
      status: 'ready',
      roleCodes: ['ORG_ADMIN'],
      permissionCodes: [
        'users:create',
        'procurement:create',
        'procurement:approve',
        'finance:review',
        'audit:read',
      ],
    }
  })

  it('renders module headers as collapsible buttons', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(html).toContain('aria-controls="sidebar-section-identity-access"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('Identity &amp; Access')
    expect(html).toContain('Users')
    expect(html).toContain('Roles')
  })

  it('renders an icon-only rail state with accessible compact links', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar collapsed onToggleCollapsed={() => undefined} />
      </MemoryRouter>,
    )

    expect(html).toContain('sidebar--collapsed')
    expect(html).toContain('aria-label="Expand sidebar"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('title="Dashboard"')
    expect(html).toContain('nav-item__icon')
  })

  it('uses the account profile image in the sidebar avatar when available', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(html).toContain('src="/mock/example-sme-logo.png"')
    expect(html).toContain('alt="Admin User profile"')
  })

  it('groups visible routes by module without changing route visibility', () => {
    const visibleAdminRoutes = routeMetadata.filter(
      (route) => route.showInSidebar && route.module === 'Identity & Access',
    )

    expect(groupSidebarRoutesByModule(visibleAdminRoutes)).toEqual([
      {
        module: 'Identity & Access',
        routes: visibleAdminRoutes,
      },
    ])
  })

  it('keeps the active route module identifiable for auto-expansion', () => {
    expect(getActiveSidebarModule(routeMetadata, '/admin/users')).toBe(
      'Identity & Access',
    )
    expect(getActiveSidebarModule(routeMetadata, '/admin/roles')).toBe(
      'Identity & Access',
    )
  })
})
