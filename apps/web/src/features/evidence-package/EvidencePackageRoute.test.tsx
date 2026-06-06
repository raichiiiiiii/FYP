import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EvidencePackageRoute } from './EvidencePackageRoute'
import { formatEvidenceStatus } from './evidencePackage.model'

describe('EvidencePackageRoute', () => {
  it('renders curated evidence groups, status labels, and safety copy', () => {
    const html = renderToStaticMarkup(<EvidencePackageRoute />)

    expect(html).toContain('Evidence Package Browser')
    expect(html).toContain('Roadmap Validation')
    expect(html).toContain('Fabric Gateway UAT proof')
    expect(html).toContain('Remaining evidence gaps')
    expect(html).toContain('Production Hardening')
    expect(html).toContain('Evidence safety rule')
    expect(html).toContain('target="_blank"')
  })

  it('does not render secret-bearing path strings', () => {
    const html = renderToStaticMarkup(<EvidencePackageRoute />).toLowerCase()

    expect(html).not.toContain('begin private key')
    expect(html).not.toContain('begin certificate')
    expect(html).not.toContain('fabric_private_key_pem')
    expect(html).not.toContain('azure_vm_ssh_key')
    expect(html).not.toContain('key.pem')
    expect(html).not.toContain('cert.pem')
    expect(html).not.toContain(`${'password'}=`)
    expect(html).not.toContain(`${'token'}=`)
  })

  it('formats status labels for status badges', () => {
    expect(formatEvidenceStatus('production-hardening')).toBe(
      'Production Hardening',
    )
    expect(formatEvidenceStatus('resolved-blocker')).toBe('Resolved Blocker')
  })
})
