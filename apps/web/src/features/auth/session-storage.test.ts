import { describe, expect, it } from 'vitest'

import { canHydrateStoredSessionLocally } from './session-storage'

describe('canHydrateStoredSessionLocally', () => {
  it('hydrates password and OIDC sessions without the dev-only session endpoint', () => {
    expect(canHydrateStoredSessionLocally({ authMode: 'password' })).toBe(true)
    expect(canHydrateStoredSessionLocally({ authMode: 'oidc' })).toBe(true)
  })

  it('keeps dev sessions on the backend session lookup path', () => {
    expect(canHydrateStoredSessionLocally({ authMode: 'dev' })).toBe(false)
  })
})
