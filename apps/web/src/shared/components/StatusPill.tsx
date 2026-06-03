import type { DependencyStatus, HealthResponse } from '../types'
import { statusLabel } from '../utils/formatting'

export function StatusPill({
  label,
  status,
}: {
  label: string
  status: DependencyStatus | HealthResponse['status']
}) {
  return (
    <div
      className={`status-pill status-pill--${status}`}
      aria-label={`${label}: ${statusLabel(status)}`}
    >
      <span aria-hidden="true" />
      <strong>{label}</strong>
      <em>{statusLabel(status)}</em>
    </div>
  )
}
