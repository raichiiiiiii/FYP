import { NavLink } from 'react-router-dom'

import { getVisibleSidebarRoutes } from '../app/authorization'
import { routeMetadata } from '../app/navigation'
import { useAppSession } from '../app/session'

export function Sidebar() {
  const { authorization, session } = useAppSession()
  const visibleRoutes = getVisibleSidebarRoutes(routeMetadata, session, authorization)
  const modules = [...new Set(visibleRoutes.map((route) => route.module))]

  return (
    <aside className="sidebar">
      <strong>MEPN</strong>
      <nav aria-label="Main navigation">
        {modules.map((module) => (
          <section key={module} className="sidebar-section">
            <span className="sidebar-module">{module}</span>
            {visibleRoutes
              .filter((route) => route.module === module)
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    isActive ? 'nav-item active' : 'nav-item'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </section>
        ))}
      </nav>
    </aside>
  )
}
