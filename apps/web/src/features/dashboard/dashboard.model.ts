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
  RECEIVING_OFFICER: 'procurement_officer',
  APPROVER: 'approver',
  APPROVER_MANAGER: 'approver',
  SUPPLIER_USER: 'supplier',
  SUPPLIER_SALES: 'supplier',
  MUDARIB_OPERATOR: 'supplier',
  SUPPLIER_FINANCE: 'finance',
  EVIDENCE_SUBMITTER: 'supplier',
  FINANCE_ACCOUNTANT: 'finance',
  FINANCIER_USER: 'financier',
  INVESTMENT_OFFICER: 'financier',
  RISK_REVIEWER: 'financier',
  DISBURSEMENT_OFFICER: 'financier',
  FINANCIER_AUDIT_VIEWER: 'auditor',
  SHARIAH_REVIEWER: 'shariah_reviewer',
  COMPLIANCE_REVIEWER: 'shariah_reviewer',
  CONTRACT_REVIEWER: 'shariah_reviewer',
  AUDITOR: 'auditor',
  AUDIT_VIEWER: 'auditor',
  REGULATOR_REVIEWER: 'auditor',
  READ_ONLY_EVIDENCE_VIEWER: 'auditor',
  DEVELOPER_INTEGRATOR: 'developer',
  ERP_INTEGRATOR: 'developer',
  API_CLIENT_MANAGER: 'developer',
  FABRIC_GOVERNANCE_ADMIN: 'sme_admin',
  PLATFORM_OPERATOR: 'developer',
  FABRIC_OPERATOR: 'developer',
  SUPPORT_OPERATOR: 'developer',
  SECURITY_OPERATOR: 'developer',
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
