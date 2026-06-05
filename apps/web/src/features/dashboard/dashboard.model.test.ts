import { describe, expect, it } from 'vitest'

import {
  countTasksByPriority,
  getActionableTasks,
  resolveDashboardRole,
} from './dashboard.model'
import { dashboardFixtures } from './dashboard.fixtures'

describe('dashboard role content', () => {
  it('resolves app roles to dashboard roles without fixture data', () => {
    expect(resolveDashboardRole(['ORG_ADMIN'])).toBe('sme_admin')
    expect(resolveDashboardRole(['PROCUREMENT_OFFICER'])).toBe(
      'procurement_officer',
    )
    expect(resolveDashboardRole(['SHARIAH_REVIEWER'])).toBe('shariah_reviewer')
    expect(resolveDashboardRole(['AUDITOR'])).toBe('auditor')
  })

  it('supports planned supplier and developer landing roles', () => {
    expect(resolveDashboardRole(['SUPPLIER_USER'])).toBe('supplier')
    expect(resolveDashboardRole(['DEVELOPER_INTEGRATOR'])).toBe('developer')
  })

  it('filters done tasks out of the actionable inbox', () => {
    expect(
      getActionableTasks([
        ...dashboardFixtures.sme_admin.tasks,
        {
          id: 'done-task',
          title: 'Done task',
          targetRoute: '/dashboard',
          priority: 'low',
          status: 'done',
        },
      ]),
    ).toHaveLength(dashboardFixtures.sme_admin.tasks.length)
  })

  it('counts critical tasks for high-attention dashboards', () => {
    expect(countTasksByPriority(dashboardFixtures.developer.tasks, 'critical')).toBe(1)
  })
})
