import {
  applicationStatusLabels,
} from './applications.model'
import type { MudarabahApplicationStatus } from './applications.types'

export function ApplicationStatusBadge({
  status,
}: {
  status: MudarabahApplicationStatus
}) {
  return (
    <span className={`status-tag status-tag--application-${status}`}>
      {applicationStatusLabels[status]}
    </span>
  )
}
