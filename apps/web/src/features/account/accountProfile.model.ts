export const accountProfileImageMaxBytes = 1024 * 1024

export const requestableRoleOptions = [
  { value: 'ORG_ADMIN', label: 'Organization Admin' },
  { value: 'PROCUREMENT_OFFICER', label: 'Procurement Officer' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'FINANCE_ACCOUNTANT', label: 'Finance Accountant' },
  { value: 'FINANCIER_USER', label: 'Financier User' },
  { value: 'SHARIAH_REVIEWER', label: 'Shariah Reviewer' },
  { value: 'AUDITOR', label: 'Auditor' },
  { value: 'DEVELOPER_INTEGRATOR', label: 'Developer Integrator' },
] as const

export function isSupportedAccountProfileImage(file: File) {
  return ['image/png', 'image/jpeg'].includes(file.type)
}

export function formatAccessCode(code: string) {
  return code
    .toLowerCase()
    .split(/[_:]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
