import { describe, expect, it } from 'vitest'

import { formatInboxType, getInboxItemTone } from './inbox.model'

describe('inbox model', () => {
  it('formats inbox types', () => {
    expect(formatInboxType('permission_request')).toBe('Permission Request')
  })

  it('uses warning tone for unread items', () => {
    expect(getInboxItemTone({ itemType: 'message', status: 'unread' })).toBe(
      'warning',
    )
    expect(
      getInboxItemTone({ itemType: 'permission_request', status: 'read' }),
    ).toBe('info')
  })
})
