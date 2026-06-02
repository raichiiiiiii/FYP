export const financeNavItems = [
  { path: '/finance/opportunities', label: 'Finance ops' },
  { path: '/finance/applications', label: 'Applications' },
  { path: '/finance/contracts', label: 'Contracts' },
  { path: '/finance/ledgers', label: 'Ledgers' },
  { path: '/finance/profit-loss', label: 'P/L' },
  { path: '/finance/closures', label: 'Closures' },
] as const

export function isFinancePath(path: string) {
  return path.startsWith('/finance/')
}
