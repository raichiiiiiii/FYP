export type DashboardRole =
  | 'sme_admin'
  | 'procurement_officer'
  | 'approver'
  | 'supplier'
  | 'finance'
  | 'financier'
  | 'shariah_reviewer'
  | 'auditor'
  | 'developer'

export type DashboardKpi = {
  id: string
  label: string
  value: string | number
  helper: string
  trend?: 'up' | 'down' | 'flat'
  severity?: 'neutral' | 'success' | 'warning' | 'danger'
}

export type SmartTask = {
  id: string
  title: string
  description?: string
  targetRoute: string
  requiredRole?: DashboardRole
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueAt?: string
  status: 'open' | 'blocked' | 'pending_external' | 'done'
}

export type DashboardSignal = {
  id: string
  label: string
  value: string | number
  description: string
  severity: 'neutral' | 'success' | 'warning' | 'danger'
  targetRoute: string
}

export type DashboardActivity = {
  id: string
  title: string
  description: string
  eventType: string
  occurredAt: string
  targetRoute: string
}

export type DashboardContent = {
  role: DashboardRole
  title: string
  subtitle: string
  kpis: DashboardKpi[]
  tasks: SmartTask[]
  signals: DashboardSignal[]
  activities: DashboardActivity[]
}
