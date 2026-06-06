import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  OperationsTimeline,
} from './OperationsTimeline'
import {
  filterTimelineItems,
  type OperationsTimelineFilter,
} from './OperationsTimeline.model'
import type { OperationsTimelineItem } from '../integrations/api/useIntegrations'

describe('OperationsTimeline', () => {
  const items: OperationsTimelineItem[] = [
    {
      id: 'outbox:1',
      timestamp: '2026-06-06T00:00:00.000Z',
      category: 'outbox',
      severity: 'warning',
      title: 'Outbox RETRYING',
      summary: 'FABRIC_ANCHOR_REQUESTED for PurchaseOrder po-1 is RETRYING.',
      entityType: 'OutboxEvent',
      entityId: 'outbox-1',
      sourcePath: '/integrations/outbox/outbox-1',
      status: 'RETRYING',
      metadataSummary: {
        attempts: 2,
        hasReconciliation: true,
      },
    },
    {
      id: 'report:1',
      timestamp: '2026-06-06T00:01:00.000Z',
      category: 'report',
      severity: 'success',
      title: 'procurement csv report completed',
      summary: 'procurement report export (csv) is completed.',
      evidencePath: 'docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md',
      status: 'completed',
      metadataSummary: {
        format: 'csv',
      },
    },
  ]

  it('renders timeline filters, safe metadata, and links', () => {
    const html = renderTimeline('all')

    expect(html).toContain('Operations timeline')
    expect(html).toContain('Recent runtime events')
    expect(html).toContain('Outbox RETRYING')
    expect(html).toContain('Open source')
    expect(html).toContain('Open evidence')
    expect(html).toContain('REPORT_EXPORT_EVIDENCE.md')
    expect(html).not.toContain('payload')
    expect(html).not.toContain(`BEGIN ${'PRIVATE'} KEY`)
  })

  it('filters timeline items by category or errors', () => {
    expect(filterTimelineItems(items, 'report')).toHaveLength(1)
    expect(filterTimelineItems(items, 'errors')).toHaveLength(0)
    expect(filterTimelineItems(items, 'all')).toHaveLength(2)
  })

  function renderTimeline(activeFilter: OperationsTimelineFilter) {
    return renderToStaticMarkup(
      <MemoryRouter>
        <OperationsTimeline
          items={items}
          activeFilter={activeFilter}
          onFilterChange={vi.fn()}
        />
      </MemoryRouter>,
    )
  }
})
