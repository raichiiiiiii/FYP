import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { getVisibleSidebarRoutes } from '../app/authorization'
import { routeMetadata } from '../app/navigation'
import { useAppSession } from '../app/session'

export function Sidebar() {
  const { authorization, session } = useAppSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleRoutes = getVisibleSidebarRoutes(routeMetadata, session, authorization)
  const modules = [...new Set(visibleRoutes.map((route) => route.module))]
  const primaryRole = authorization.roleCodes[0]
  const roleLabel = primaryRole ? formatRoleLabel(primaryRole) : 'No role loaded'
  const canOpenIntegrations = visibleRoutes.some(
    (route) => route.path === '/integrations',
  )
  const canOpenAudit = visibleRoutes.some((route) => route.path === '/audit/search')
  const statusTarget = canOpenIntegrations
    ? '/integrations'
    : canOpenAudit
      ? '/audit/search'
      : '/dashboard'

  return (
    <aside className={mobileOpen ? 'sidebar sidebar--mobile-open' : 'sidebar'}>
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">
          M
        </div>
        <div>
          <strong>MEPN</strong>
          <span>Mudarabah E-Procurement</span>
        </div>
      </div>

      <div className="sidebar-session" aria-label="Current session">
        <div className="sidebar-avatar" aria-hidden="true">
          {getRoleInitials(roleLabel)}
        </div>
        <div>
          <strong>{roleLabel}</strong>
          <span>
            {session.organizationId
              ? `Org ${shortenId(session.organizationId)}`
              : 'Organization pending'}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-controls="main-navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((isOpen) => !isOpen)}
      >
        {mobileOpen ? 'Hide navigation' : 'Show navigation'}
      </button>

      <nav
        id="main-navigation"
        className={
          mobileOpen
            ? 'sidebar-navigation sidebar-navigation--open'
            : 'sidebar-navigation'
        }
        aria-label="Main navigation"
      >
        {modules.map((module) => (
          <section key={module} className="sidebar-section">
            <span className="sidebar-module">
              {module}
              <small>
                {
                  visibleRoutes.filter((route) => route.module === module)
                    .length
                }
              </small>
            </span>
            {visibleRoutes
              .filter((route) => route.module === module)
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    isActive ? 'nav-item active' : 'nav-item'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </section>
        ))}
        {modules.length === 0 ? (
          <p className="sidebar-empty">Sign in to load route access.</p>
        ) : null}
      </nav>

      <div className="sidebar-status-widget" aria-label="Audit and outbox status">
        <div>
          <span className="sidebar-status-dot" aria-hidden="true" />
          <strong>External effects</strong>
        </div>
        <p>
          Review audit, outbox, and anchor states from backend-backed status
          screens.
        </p>
        <NavLink to={statusTarget} onClick={() => setMobileOpen(false)}>
          Open status
        </NavLink>
      </div>
    </aside>
  )
}

function formatRoleLabel(roleCode: string) {
  return roleCode
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getRoleInitials(label: string) {
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function shortenId(id: string) {
  if (id.length <= 8) {
    return id
  }

  return `${id.slice(0, 4)}...${id.slice(-4)}`
}
