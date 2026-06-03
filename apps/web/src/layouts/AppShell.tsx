import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from './Sidebar'

export function AppShell() {
  const location = useLocation()
  const isEntryRoute =
    location.pathname === '/login' || location.pathname === '/org/setup'

  return (
    <div className={isEntryRoute ? 'app-shell app-shell--entry' : 'app-shell'}>
      {isEntryRoute ? null : <Sidebar />}
      <main className="content-shell">
        <Outlet />
      </main>
    </div>
  )
}
