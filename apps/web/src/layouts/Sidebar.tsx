import { useMemo, useState } from 'react'
import {
  Activity,
  Archive,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileClock,
  FileSearch,
  FileText,
  GitGraph,
  Hash,
  LayoutDashboard,
  Landmark,
  Network,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  ReceiptText,
  Scale,
  Send,
  ServerCog,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

import { getVisibleSidebarRoutes } from '../app/authorization'
import {
  routeMetadata,
  type AppModule,
  type AppRouteMetadata,
} from '../app/navigation'
import { useAppSession } from '../app/session'
import { AccountMenu } from '../features/account/AccountMenu'
import {
  getActiveSidebarModule,
  getSidebarModuleId,
  groupSidebarRoutesByModule,
} from './sidebarNavigation'

type SidebarProps = {
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export function Sidebar({
  collapsed: sidebarCollapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
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
    <aside
      className={[
        'sidebar',
        mobileOpen ? 'sidebar--mobile-open' : '',
        sidebarCollapsed ? 'sidebar--collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">
          M
        </div>
        <div>
          <strong>MEPN</strong>
          <span>Mudarabah E-Procurement</span>
        </div>
        <button
          type="button"
          className="sidebar-collapse-toggle"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={sidebarCollapsed}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapsed}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen aria-hidden="true" />
          ) : (
            <PanelLeftClose aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="sidebar-session" aria-label="Current session">
        <AccountMenu />
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
          const collapsed =
            !sidebarCollapsed &&
            collapsedModules.has(module) &&
            activeModule !== module
          const sectionId = `sidebar-section-${getSidebarModuleId(module)}`
          const ModuleIcon = sidebarModuleIcons[module] ?? Settings

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
                title={module}
                onClick={() => toggleModule(module)}
              >
                <ModuleIcon className="sidebar-module__icon" aria-hidden="true" />
                <span className="sidebar-module__label">{module}</span>
                <small>{routes.length}</small>
              </button>
              <div
                id={sectionId}
                className="sidebar-section-links"
                hidden={collapsed}
              >
                {routes.map((item) => (
                  <SidebarNavItem
                    key={item.path}
                    item={item}
                    compact={sidebarCollapsed}
                    onNavigate={() => setMobileOpen(false)}
                  />
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
          <ServerCog aria-hidden="true" />
          <span>Open status</span>
        </NavLink>
      </div>
    </aside>
  )
}

type SidebarNavItemProps = {
  item: AppRouteMetadata
  compact: boolean
  onNavigate: () => void
}

function SidebarNavItem({ item, compact, onNavigate }: SidebarNavItemProps) {
  const Icon =
    sidebarRouteIcons[item.path] ?? sidebarModuleIcons[item.module] ?? FileText

  return (
    <NavLink
      to={item.path}
      aria-label={compact ? item.label : undefined}
      title={compact ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        isActive
          ? 'nav-item nav-item--with-icon active'
          : 'nav-item nav-item--with-icon'
      }
    >
      <Icon className="nav-item__icon" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}

const sidebarModuleIcons: Partial<Record<AppModule, LucideIcon>> = {
  Dashboard: LayoutDashboard,
  Organization: Building2,
  'Identity & Access': ShieldCheck,
  Procurement: ShoppingCart,
  Evidence: FileCheck2,
  Audit: FileSearch,
  Finance: Landmark,
  'Graph/Canvas': Network,
  Integrations: Plug,
  Operations: Activity,
  Administration: Settings,
  Reports: BarChart3,
  'Review Package': Archive,
}

const sidebarRouteIcons: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/org/setup': Building2,
  '/organization/profile': Building2,
  '/admin/users': Users,
  '/admin/roles': UserCog,
  '/procurement/projects': PackageCheck,
  '/procurement/suppliers': Truck,
  '/procurement/requisitions': ClipboardList,
  '/procurement/rfqs': Send,
  '/procurement/quotations': FileText,
  '/procurement/purchase-orders': ClipboardCheck,
  '/procurement/receipts': CheckSquare,
  '/procurement/invoices': ReceiptText,
  '/evidence': FileCheck2,
  '/evidence/hash-records': Hash,
  '/audit/search': FileSearch,
  '/audit/review': BookOpenCheck,
  '/finance/opportunities': WalletCards,
  '/finance/applications': FileClock,
  '/finance/contracts': Scale,
  '/finance/ledgers': Landmark,
  '/finance/profit-loss': BarChart3,
  '/finance/closures': PackageCheck,
  '/graph/projects': GitGraph,
  '/integrations': Plug,
  '/operations': ServerCog,
  '/reports': BarChart3,
  '/evidence-package': Archive,
}

