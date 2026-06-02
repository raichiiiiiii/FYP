import type { DependencyStatus, HealthResponse } from '../types'

export function statusLabel(status: DependencyStatus | HealthResponse['status']) {
  return status === 'ok' ? 'Operational' : 'Attention needed'
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Pending'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatCurrency(value?: number | null, currency = 'MYR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'Pending'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}
