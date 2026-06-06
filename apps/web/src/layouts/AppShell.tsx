import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { DemoGuideOverlay } from '../features/demo/DemoGuideOverlay'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isEntryRoute =
    location.pathname === '/login' ||
    location.pathname === '/org/setup' ||
    location.pathname === '/auth/invitations/accept'
  const shellClassName = isEntryRoute
    ? 'app-shell app-shell--entry'
    : sidebarCollapsed
      ? 'app-shell app-shell--sidebar-collapsed'
      : 'app-shell'

  return (
    <div className={shellClassName}>
      {isEntryRoute ? null : (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />
      )}
      <main className="content-shell">
        <Outlet />
      </main>
      {isEntryRoute ? null : <DemoGuideOverlay />}
    </div>
  )
}
