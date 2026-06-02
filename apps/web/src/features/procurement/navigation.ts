export const procurementNavItems = [
  { path: '/procurement/projects', label: 'Projects' },
  { path: '/procurement/suppliers', label: 'Suppliers' },
  { path: '/procurement/requisitions', label: 'Requisitions' },
  { path: '/procurement/approvals', label: 'Approvals' },
  { path: '/procurement/approval-rules', label: 'Approval Rules' },
  { path: '/procurement/rfqs', label: 'RFQs' },
  { path: '/procurement/quotations', label: 'Quotations' },
  { path: '/procurement/quotations/compare', label: 'Compare' },
  { path: '/procurement/purchase-orders', label: 'POs' },
  { path: '/procurement/receipts', label: 'Receipts' },
  { path: '/procurement/invoices', label: 'Invoices' },
  { path: '/procurement/matching', label: 'Matching' },
] as const

export function isProcurementPath(path: string) {
  return path.startsWith('/procurement/')
}
