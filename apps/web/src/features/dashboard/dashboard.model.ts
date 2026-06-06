import type { AppRoleCode } from '../../shared/types'
import type { DashboardRole, SmartTask } from './dashboard.types'

const rolePriority: DashboardRole[] = [
  'sme_admin',
  'procurement_officer',
  'approver',
  'supplier',
  'finance',
  'financier',
  'shariah_reviewer',
  'auditor',
  'developer',
]

const appRoleToDashboardRole: Record<AppRoleCode, DashboardRole> = {
  ORG_ADMIN: 'sme_admin',
  PROCUREMENT_OFFICER: 'procurement_officer',
  APPROVER: 'approver',
  SUPPLIER_USER: 'supplier',
  FINANCE_ACCOUNTANT: 'finance',
  FINANCIER_USER: 'financier',
  SHARIAH_REVIEWER: 'shariah_reviewer',
  AUDITOR: 'auditor',
  DEVELOPER_INTEGRATOR: 'developer',
  FABRIC_GOVERNANCE_ADMIN: 'sme_admin',
  PLATFORM_OPERATOR: 'developer',
}

export function resolveDashboardRole(roleCodes: AppRoleCode[]): DashboardRole {
  const roles = roleCodes.map((roleCode) => appRoleToDashboardRole[roleCode])

  return (
    rolePriority.find((role) => roles.includes(role)) ??
    'procurement_officer'
  )
}

export function getActionableTasks(tasks: SmartTask[]) {
  return tasks.filter((task) => task.status !== 'done')
}

export function countTasksByPriority(tasks: SmartTask[], priority: SmartTask['priority']) {
  return tasks.filter((task) => task.priority === priority).length
}
