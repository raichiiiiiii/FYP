import { NavLink } from 'react-router-dom'

import { getVisibleWorkspaceTabs } from './applicationWorkspace.model'
import type { WorkspaceTabId } from './applicationWorkspace.types'
import type { AppRoleCode } from '../../../../shared/types'

export function ApplicationWorkspaceTabs({
  applicationId,
  selectedTab,
  roleCodes,
}: {
  applicationId: string
  selectedTab: WorkspaceTabId
  roleCodes: AppRoleCode[]
}) {
  const tabs = getVisibleWorkspaceTabs(roleCodes)

  return (
    <nav className="module-tabs" aria-label="Mudarabah workspace tabs">
      {tabs.map((tab) =>
        tab.canView ? (
          <NavLink
            key={tab.id}
            className={({ isActive }) =>
              isActive || selectedTab === tab.id
                ? 'module-tab active'
                : 'module-tab'
            }
            to={`/finance/applications/${applicationId}/${tab.id}`}
          >
            {tab.label}
          </NavLink>
        ) : (
          <span
            key={tab.id}
            aria-disabled="true"
            className="module-tab module-tab--disabled"
            title={`${tab.label} is not visible to the current role`}
          >
            {tab.label}
          </span>
        ),
      )}
    </nav>
  )
}
