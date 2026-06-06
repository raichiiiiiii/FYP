import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { DemoGuidePanel } from './DemoGuideOverlay'
import { DemoGuideToggle } from './DemoGuideToggle'
import { getActiveDemoGuideStep } from './demoGuideRoute'

describe('DemoGuideOverlay UI pieces', () => {
  it('renders an accessible toggle with reviewed progress', () => {
    const html = renderToStaticMarkup(
      <DemoGuideToggle
        expanded={false}
        reviewedCount={2}
        totalCount={11}
        onToggle={() => undefined}
      />,
    )

    expect(html).toContain('aria-controls="demo-guide-panel"')
    expect(html).toContain('aria-label="Open guided demo checklist"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Demo guide')
    expect(html).toContain('2/11 reviewed')
  })

  it('labels the expanded toggle as a close action', () => {
    const html = renderToStaticMarkup(
      <DemoGuideToggle
        expanded
        reviewedCount={4}
        totalCount={11}
        onToggle={() => undefined}
      />,
    )

    expect(html).toContain('aria-label="Close guided demo checklist"')
    expect(html).toContain('aria-expanded="true"')
  })

  it('renders route links, evidence links, and manual review checkboxes', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DemoGuidePanel
          activeStepId="dashboard-overview"
          progress={{
            collapsed: false,
            reviewedStepIds: ['dashboard-overview'],
            visitedStepIds: ['reports-json-export'],
          }}
          onReset={vi.fn()}
          onVisitStep={vi.fn()}
          onToggleReviewed={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(html).toContain('Guided demo mode')
    expect(html).toContain('Follow the review route')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('Current route')
    expect(html).toContain('Reviewed')
    expect(html).toContain('Evidence-backed')
    expect(html).toContain('Environment-gated')
    expect(html).toContain('href="/dashboard"')
    expect(html).toContain('docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md')
    expect(html).not.toContain('Create demo record')
    expect(html).not.toContain('verified=true from mock')
  })

  it('matches nested routes to the safest active guide step', () => {
    expect(getActiveDemoGuideStep('/dashboard')?.id).toBe('dashboard-overview')
    expect(getActiveDemoGuideStep('/procurement/requisitions/req-1')?.id).toBe(
      'source-to-pay-flow',
    )
    expect(getActiveDemoGuideStep('/unknown')).toBeNull()
  })
})
