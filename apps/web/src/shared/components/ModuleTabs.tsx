import { NavLink } from 'react-router-dom'

export function ModuleTabs({
  tabs,
}: {
  tabs: Array<{ path: string; label: string }>
}) {
  return (
    <nav className="module-tabs" aria-label="Module sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            isActive ? 'module-tab active' : 'module-tab'
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
