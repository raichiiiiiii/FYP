import { describe, expect, it } from 'vitest'

import {
  countTasksByPriority,
  getActionableTasks,
  getDashboardContent,
  resolveDashboardRole,
} from './dashboard.model'
import { dashboardFixtures } from './dashboard.fixtures'

describe('dashboard role content', () => {
  it('resolves an SME admin cockpit from ORG_ADMIN role claims', () => {
    const content = getDashboardContent(['ORG_ADMIN'])

    expect(content.role).toBe('sme_admin')
    expect(content.kpis.some((kpi) => kpi.id === 'active-users')).toBe(true)
    expect(content.tasks.map((task) => task.targetRoute)).toContain(
      '/admin/users',
    )
  })

  it('resolves procurement officer task visibility from procurement role claims', () => {
    const content = getDashboardContent(['PROCUREMENT_OFFICER'])

    expect(content.role).toBe('procurement_officer')
    expect(content.tasks.map((task) => task.targetRoute)).toContain(
      '/procurement/quotations/compare',
    )
    expect(content.tasks.map((task) => task.targetRoute)).not.toContain(
      '/admin/users',
    )
  })

  it('shows pending anchor state to auditors without treating it as successful', () => {
    const content = getDashboardContent(['AUDITOR'])
    const anchorSignal = content.signals.find(
      (signal) => signal.id === 'fabric-pending',
    )

    expect(anchorSignal?.severity).toBe('warning')
    expect(`${anchorSignal?.value} ${anchorSignal?.description}`).toContain(
      'pending',
    )
    expect(`${anchorSignal?.label} ${anchorSignal?.description}`).not.toMatch(
      /synced|successful/i,
    )
  })

  it('keeps Shariah reviewer content separate from financier actions', () => {
    const content = getDashboardContent(['SHARIAH_REVIEWER'])

    expect(content.role).toBe('shariah_reviewer')
    expect(content.tasks.map((task) => task.targetRoute)).toContain(
      '/finance/contracts',
    )
    expect(content.tasks.map((task) => task.id)).not.toContain('financier-dd')
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
