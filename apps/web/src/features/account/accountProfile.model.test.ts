import { describe, expect, it } from 'vitest'

import {
  accountPasswordMinLength,
  formatAccessCode,
  isValidLocalPasswordLength,
  requestableRoleOptions,
} from './accountProfile.model'

describe('account profile model', () => {
  it('formats role and permission codes for profile display', () => {
    expect(formatAccessCode('ORG_ADMIN')).toBe('Org Admin')
    expect(formatAccessCode('users:create')).toBe('Users Create')
  })

  it('keeps requestable roles unique', () => {
    const values = requestableRoleOptions.map((option) => option.value)

    expect(new Set(values).size).toBe(values.length)
  })

  it('uses the seeded local password length as the minimum accepted password length', () => {
    expect(accountPasswordMinLength).toBe(8)
    expect(isValidLocalPasswordLength('password')).toBe(true)
    expect(isValidLocalPasswordLength('short')).toBe(false)
  })
})
