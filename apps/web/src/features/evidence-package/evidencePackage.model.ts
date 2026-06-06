import type { EvidencePackageStatus } from './evidencePackage.manifest'

export function formatEvidenceStatus(status: EvidencePackageStatus) {
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
