import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import {
  AuditEventList,
  AuditVerificationLegend,
  DocumentHashVerificationPanel,
} from './AuditScreen'
import { auditVerificationFixtures } from './verification/auditVerification.fixtures'

const fixtureEvents = [
  auditVerificationFixtures.localOnly,
  auditVerificationFixtures.pending,
  auditVerificationFixtures.submitted,
  auditVerificationFixtures.verified,
  auditVerificationFixtures.failed,
  auditVerificationFixtures.unavailable,
]

describe('audit verification UI', () => {
  it('renders a reviewer legend for every anchor state', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuditVerificationLegend events={fixtureEvents} />
      </MemoryRouter>,
    )

    expect(html).toContain('Verification status legend')
    expect(html).toContain('Local audit event only')
    expect(html).toContain('Anchor pending')
    expect(html).toContain('Anchor submitted')
    expect(html).toContain('Anchor verified')
    expect(html).toContain('Anchor failed')
    expect(html).toContain('Fabric unavailable')
    expect(html).toContain('verified only when the backend supplies')
  })

  it('explains canonical hash verification without treating mock anchors as verified', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DocumentHashVerificationPanel
          events={[
            auditVerificationFixtures.submitted,
            auditVerificationFixtures.verified,
          ]}
        />
      </MemoryRouter>,
    )

    expect(html).toContain('MEPN hashes canonical JSON')
    expect(html).toContain('hash-submitted')
    expect(html).toContain('hash-verified')
    expect(html).toContain('Anchor submitted')
    expect(html).toContain('Anchor verified')
  })

  it('shows outbox and source-record context on audit rows', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuditEventList
          events={[
            auditVerificationFixtures.pending,
            auditVerificationFixtures.failed,
          ]}
        />
      </MemoryRouter>,
    )

    expect(html).toContain('outbox-pending')
    expect(html).toContain('Anchor work is still pending or processing')
    expect(html).toContain('Worker/operator review is required')
    expect(html).toContain('Open source record')
  })
})
