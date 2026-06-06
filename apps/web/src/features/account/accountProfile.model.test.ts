import { describe, expect, it } from 'vitest'

import { formatAccessCode, requestableRoleOptions } from './accountProfile.model'

describe('account profile model', () => {
  it('formats role and permission codes for profile display', () => {
    expect(formatAccessCode('ORG_ADMIN')).toBe('Org Admin')
    expect(formatAccessCode('users:create')).toBe('Users Create')
  })

  it('keeps requestable roles unique', () => {
    const values = requestableRoleOptions.map((option) => option.value)

    expect(new Set(values).size).toBe(values.length)
  })
})
