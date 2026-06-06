import { Outlet, useLocation } from 'react-router-dom'

import { DemoGuideOverlay } from '../features/demo/DemoGuideOverlay'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const location = useLocation()
  const isEntryRoute =
    location.pathname === '/login' ||
    location.pathname === '/org/setup' ||
    location.pathname === '/auth/invitations/accept'

  return (
    <div className={isEntryRoute ? 'app-shell app-shell--entry' : 'app-shell'}>
      {isEntryRoute ? null : <Sidebar />}
      <main className="content-shell">
        <Outlet />
      </main>
      {isEntryRoute ? null : <DemoGuideOverlay />}
    </div>
  )
}
