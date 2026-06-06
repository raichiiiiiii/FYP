import type { InboxItem } from '../../shared/types'

export const inboxRoleRecipientOptions = [
  { value: 'ORG_ADMIN', label: 'Organization Admins' },
  { value: 'PROCUREMENT_OFFICER', label: 'Procurement Officers' },
  { value: 'APPROVER', label: 'Approvers' },
  { value: 'FINANCIER_USER', label: 'Financier Users' },
  { value: 'SHARIAH_REVIEWER', label: 'Shariah Reviewers' },
  { value: 'AUDITOR', label: 'Auditors' },
  { value: 'DEVELOPER_INTEGRATOR', label: 'Developer Integrators' },
] as const

export function getInboxItemTone(item: Pick<InboxItem, 'itemType' | 'status'>) {
  if (item.status === 'unread') {
    return 'warning'
  }

  if (item.itemType === 'permission_request') {
    return 'info'
  }

  return 'neutral'
}

export function formatInboxType(itemType: string) {
  return itemType
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
