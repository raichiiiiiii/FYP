export const evidenceNavItems = [
  { path: '/evidence/documents', label: 'Documents' },
  { path: '/evidence/items', label: 'Evidence' },
  { path: '/evidence/packs', label: 'Packs' },
  { path: '/evidence/hashes', label: 'Hashes' },
  { path: '/evidence/timeline', label: 'Timeline' },
] as const

export function isEvidencePath(path: string) {
  return path.startsWith('/evidence/')
}
