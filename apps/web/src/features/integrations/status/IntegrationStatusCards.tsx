import { StatusBadge } from '../../../shared/components/StatusBadge'
import { formatDateTime } from '../../../shared/utils/formatting'
import {
  type IntegrationStatusCard,
  integrationHealthLabel,
  integrationModeLabel,
} from './integrationStatus.model'

export function IntegrationStatusCards({
  statuses,
  title = 'Integration health',
}: {
  statuses: IntegrationStatusCard[]
  title?: string
}) {
  return (
    <section className="status-card-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Status visibility</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="status-card-grid">
        {statuses.map((status) => (
          <article
            key={status.id}
            className={`status-card status-card--${status.status}`}
          >
            <div className="status-card-header">
              <span>{status.name}</span>
              <StatusBadge status={status.status} />
            </div>
            <strong>{integrationHealthLabel(status.status)}</strong>
            <p>{status.message}</p>
            <span className={`status-card-mode status-card-mode--${status.mode}`}>
              {integrationModeLabel(status.mode)}
            </span>
            <small>
              Evidence: {status.evidence}
              {status.lastCheckedAt
                ? ` / ${formatDateTime(status.lastCheckedAt)}`
                : ''}
            </small>
          </article>
        ))}
      </div>
    </section>
  )
}
