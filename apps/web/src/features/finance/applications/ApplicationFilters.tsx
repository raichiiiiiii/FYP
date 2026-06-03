import {
  applicationStatusLabels,
  applicationStatuses,
} from './applications.model'
import type {
  ApplicationFiltersState,
  ApplicationRiskRating,
  ApplicationReviewRole,
  MudarabahApplicationStatus,
} from './applications.types'

const roleQueues: Array<{
  value: ApplicationReviewRole
  label: string
}> = [
  { value: 'all', label: 'All queues' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'financier', label: 'Financier' },
  { value: 'shariah', label: 'Shariah' },
  { value: 'auditor', label: 'Auditor' },
]

const riskRatings: Array<{
  value: ApplicationRiskRating | 'all'
  label: string
}> = [
  { value: 'all', label: 'All risk ratings' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
  { value: 'unknown', label: 'Unknown' },
]

export function ApplicationFilters({
  filters,
  onChange,
}: {
  filters: ApplicationFiltersState
  onChange: (filters: ApplicationFiltersState) => void
}) {
  return (
    <section className="applications-toolbar" aria-label="Application filters">
      <label className="field">
        <span>Search</span>
        <input
          value={filters.search}
          placeholder="Search opportunity, applicant, reviewer, or ID"
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value })
          }
        />
      </label>
      <label className="field">
        <span>Status</span>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as MudarabahApplicationStatus | 'all',
            })
          }
        >
          <option value="all">All statuses</option>
          {applicationStatuses.map((status) => (
            <option key={status} value={status}>
              {applicationStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Role queue</span>
        <select
          value={filters.roleQueue}
          onChange={(event) =>
            onChange({
              ...filters,
              roleQueue: event.target.value as ApplicationReviewRole,
            })
          }
        >
          {roleQueues.map((queue) => (
            <option key={queue.value} value={queue.value}>
              {queue.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Risk</span>
        <select
          value={filters.riskRating}
          onChange={(event) =>
            onChange({
              ...filters,
              riskRating: event.target.value as ApplicationRiskRating | 'all',
            })
          }
        >
          {riskRatings.map((rating) => (
            <option key={rating.value} value={rating.value}>
              {rating.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
