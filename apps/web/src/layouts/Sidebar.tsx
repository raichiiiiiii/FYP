import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { getVisibleSidebarRoutes } from '../app/authorization'
import { routeMetadata, type AppModule } from '../app/navigation'
import { useAppSession } from '../app/session'
import {
  getActiveSidebarModule,
  getSidebarModuleId,
  groupSidebarRoutesByModule,
} from './sidebarNavigation'

export function Sidebar() {
  const location = useLocation()
  const { authorization, session } = useAppSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsedModules, setCollapsedModules] = useState<Set<AppModule>>(
    () => new Set(),
  )
  const visibleRoutes = getVisibleSidebarRoutes(routeMetadata, session, authorization)
  const groupedModules = useMemo(
    () => groupSidebarRoutesByModule(visibleRoutes),
    [visibleRoutes],
  )
  const activeModule = useMemo(
    () => getActiveSidebarModule(visibleRoutes, location.pathname),
    [location.pathname, visibleRoutes],
  )
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

  function toggleModule(module: AppModule) {
    setCollapsedModules((current) => {
      const next = new Set(current)

      if (next.has(module)) {
        next.delete(module)
      } else {
        next.add(module)
      }

      return next
    })
  }

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
        {groupedModules.map(({ module, routes }) => {
          const collapsed = collapsedModules.has(module) && activeModule !== module
          const sectionId = `sidebar-section-${getSidebarModuleId(module)}`

          return (
            <section
              key={module}
              className={
                collapsed
                  ? 'sidebar-section sidebar-section--collapsed'
                  : 'sidebar-section'
              }
            >
              <button
                type="button"
                className="sidebar-module"
                aria-controls={sectionId}
                aria-expanded={!collapsed}
                onClick={() => toggleModule(module)}
              >
                <span className="sidebar-module__label">{module}</span>
                <small>{routes.length}</small>
                <span className="sidebar-module__chevron" aria-hidden="true">
                  v
                </span>
              </button>
              <div
                id={sectionId}
                className="sidebar-section-links"
                hidden={collapsed}
              >
                {routes.map((item) => (
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
              </div>
            </section>
          )
        })}
        {groupedModules.length === 0 ? (
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
