import { Link } from 'react-router-dom'

import { EmptyState } from '../../shared/components/EmptyState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { formatDateTime } from '../../shared/utils/formatting'
import type {
  OperationsTimelineCategory,
  OperationsTimelineItem,
  OperationsTimelineSeverity,
} from '../integrations/api/useIntegrations'
import {
  filterTimelineItems,
  type OperationsTimelineFilter,
} from './OperationsTimeline.model'

const timelineFilterOptions: Array<{
  id: OperationsTimelineFilter
  label: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'worker', label: 'Worker' },
  { id: 'outbox', label: 'Outbox' },
  { id: 'report', label: 'Reports' },
  { id: 'backup', label: 'Backup' },
  { id: 'errors', label: 'Errors only' },
]

export function OperationsTimeline({
  items,
  activeFilter,
  onFilterChange,
}: {
  items: OperationsTimelineItem[]
  activeFilter: OperationsTimelineFilter
  onFilterChange: (filter: OperationsTimelineFilter) => void
}) {
  const visibleItems = filterTimelineItems(items, activeFilter)

  return (
    <section className="operations-timeline" aria-label="Operations timeline">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Operations timeline</span>
          <h2>Recent runtime events</h2>
        </div>
      </div>
      <div className="operations-timeline-filters" role="group" aria-label="Timeline filters">
        {timelineFilterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              activeFilter === option.id
                ? 'operations-timeline-filter operations-timeline-filter--active'
                : 'operations-timeline-filter'
            }
            aria-pressed={activeFilter === option.id}
            onClick={() => onFilterChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visibleItems.length ? (
        <ol className="operations-timeline-list">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className={`operations-timeline-item operations-timeline-item--${item.severity}`}
            >
              <div className="operations-timeline-marker" aria-hidden="true" />
              <article>
                <div className="operations-timeline-item__header">
                  <div>
                    <span>{timelineCategoryLabel(item.category)}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <StatusBadge status={timelineSeverityLabel(item.severity)} />
                </div>
                <p>{item.summary}</p>
                <dl className="operations-timeline-meta">
                  <div>
                    <dt>Time</dt>
                    <dd>{formatDateTime(item.timestamp)}</dd>
                  </div>
                  {item.status ? (
                    <div>
                      <dt>Status</dt>
                      <dd>{item.status}</dd>
                    </div>
                  ) : null}
                  {item.entityType && item.entityId ? (
                    <div>
                      <dt>Source</dt>
                      <dd>
                        {item.entityType} / {item.entityId}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {item.metadataSummary ? (
                  <dl className="operations-timeline-metadata">
                    {Object.entries(item.metadataSummary).map(([key, value]) => (
                      <div key={key}>
                        <dt>{metadataLabel(key)}</dt>
                        <dd>{String(value ?? 'not set')}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <div className="operations-timeline-links">
                  {item.sourcePath ? (
                    item.sourcePath.startsWith('/') ? (
                      <Link to={item.sourcePath}>Open source</Link>
                    ) : (
                      <a href={item.sourcePath} target="_blank" rel="noreferrer">
                        Open source
                      </a>
                    )
                  ) : null}
                  {item.evidencePath ? (
                    <a href={`/${item.evidencePath}`} target="_blank" rel="noreferrer">
                      Open evidence
                    </a>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="No timeline events match this filter">
          Runtime event summaries will appear after worker, outbox,
          reconciliation, report, or Fabric records exist.
        </EmptyState>
      )}
    </section>
  )
}

function timelineCategoryLabel(category: OperationsTimelineCategory) {
  const labels: Record<OperationsTimelineCategory, string> = {
    health: 'Health',
    worker: 'Worker',
    outbox: 'Outbox',
    reconciliation: 'Reconciliation',
    fabric: 'Fabric',
    report: 'Report',
    backup: 'Backup',
    deployment: 'Deployment',
  }

  return labels[category]
}

function timelineSeverityLabel(severity: OperationsTimelineSeverity) {
  const labels: Record<OperationsTimelineSeverity, string> = {
    info: 'Info',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
  }

  return labels[severity]
}

function metadataLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase())
}
