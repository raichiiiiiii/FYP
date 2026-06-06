export type EvidencePackageCategory =
  | 'roadmap-validation'
  | 'deployment'
  | 'fabric-hash'
  | 'qa-uat'
  | 'screenshots'
  | 'blockers'
  | 'remaining-gaps'
  | 'safety'

export type EvidencePackageStatus =
  | 'complete'
  | 'partial'
  | 'production-hardening'
  | 'resolved-blocker'

export type EvidencePackageItem = {
  id: string
  title: string
  description: string
  path: string
  status: EvidencePackageStatus
  category: EvidencePackageCategory
  riskNote: string
  safeToQuote: boolean
}

export const evidencePackageItems: readonly EvidencePackageItem[] = [
  {
    id: 'implementation-report',
    title: 'Soon-to-be implementation report',
    description:
      'Final phase report covering completed slices, commits, endpoints, evidence, and remaining hardening work.',
    path: 'docs/roadmap/soon-to-be-feature-implementation-report.md',
    status: 'complete',
    category: 'roadmap-validation',
    riskNote: 'Summary document only; it should not be treated as a production-readiness certification.',
    safeToQuote: true,
  },
  {
    id: 'feature-status-roadmap',
    title: 'Feature status roadmap',
    description:
      'Current implemented, partial, soon-to-be, and delighter feature status.',
    path: 'docs/roadmap/feature-status-and-future-implementation.md',
    status: 'complete',
    category: 'roadmap-validation',
    riskNote: 'Roadmap is source-of-truth for planning status, not runtime state.',
    safeToQuote: true,
  },
  {
    id: 'final-validation-matrix',
    title: 'Final validation matrix',
    description:
      'Command matrix for local validation, feature coverage, deployment checks, and failure recording.',
    path: 'docs/testing/final-validation-matrix.md',
    status: 'complete',
    category: 'roadmap-validation',
    riskNote: 'Environment-gated tests are explicitly labelled and must not be counted as ordinary local passes.',
    safeToQuote: true,
  },
  {
    id: 'evidence-index',
    title: 'Evidence index',
    description: 'Reviewer entry point for sanitized evidence and known limitations.',
    path: 'docs/evidence/EVIDENCE_INDEX.md',
    status: 'complete',
    category: 'roadmap-validation',
    riskNote: 'Index links curated artifacts; it does not expose raw secret files.',
    safeToQuote: true,
  },
  {
    id: 'vm-deployment-evidence',
    title: 'Azure VM deployment evidence',
    description:
      'Sanitized deployment checklist, health checks, and Fabric Gateway deployment status.',
    path: 'docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md',
    status: 'complete',
    category: 'deployment',
    riskNote: 'Evidence is sanitized; do not request or paste VM credentials.',
    safeToQuote: true,
  },
  {
    id: 'latest-vm-output',
    title: 'Latest VM evidence output',
    description:
      'Sanitized collected VM output from the deployment evidence script.',
    path: 'docs/evidence/deployment/latest-vm-deployment-evidence.txt',
    status: 'complete',
    category: 'deployment',
    riskNote: 'Output should remain sanitized and must not be replaced with raw shell logs.',
    safeToQuote: true,
  },
  {
    id: 'fabric-gateway-uat',
    title: 'Fabric Gateway UAT proof',
    description:
      'Reviewer proof package for real Gateway anchoring and API-side ReadAnchor verification.',
    path: 'docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md',
    status: 'complete',
    category: 'fabric-hash',
    riskNote: 'Real proof is VM-local FYP/UAT evidence; mock anchors must not be represented as real Fabric proof.',
    safeToQuote: true,
  },
  {
    id: 'canonical-hash-reference',
    title: 'Canonical hash verification reference',
    description: 'Canonical hashing behavior and verification support document.',
    path: 'docs/evidence/canonical-hash-verification.md',
    status: 'complete',
    category: 'fabric-hash',
    riskNote: 'Reference document only; runtime verification still depends on API and chaincode checks.',
    safeToQuote: true,
  },
  {
    id: 'auth-oidc-invitation',
    title: 'Auth OIDC and invitation UAT evidence',
    description:
      'Auth mode, dev-login guard, OIDC test-provider, and invitation acceptance evidence.',
    path: 'docs/evidence/qa/AUTH_OIDC_INVITATION_UAT_EVIDENCE.md',
    status: 'partial',
    category: 'qa-uat',
    riskNote: 'Real external OIDC provider UAT remains production hardening.',
    safeToQuote: true,
  },
  {
    id: 'guided-demo-mode',
    title: 'Guided Demo Mode evidence',
    description:
      'In-app reviewer checklist evidence for the FYP demo path.',
    path: 'docs/evidence/qa/GUIDED_DEMO_MODE_EVIDENCE.md',
    status: 'complete',
    category: 'qa-uat',
    riskNote: 'Checklist progress is local UI state and must not be interpreted as backend workflow state.',
    safeToQuote: true,
  },
  {
    id: 'report-export-evidence',
    title: 'Report export evidence',
    description: 'Backend report DTO and audited JSON export evidence.',
    path: 'docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md',
    status: 'complete',
    category: 'qa-uat',
    riskNote: 'JSON is implemented; PDF/spreadsheet exports remain hardening until added.',
    safeToQuote: true,
  },
  {
    id: 'loss-exception-evidence',
    title: 'Loss exception workflow evidence',
    description:
      'Loss exception classification, reviewer UI, closure gate, and no-guaranteed-return evidence.',
    path: 'docs/evidence/qa/LOSS_EXCEPTION_WORKFLOW_EVIDENCE.md',
    status: 'complete',
    category: 'qa-uat',
    riskNote: 'Legal/Shariah thresholds remain product hardening.',
    safeToQuote: true,
  },
  {
    id: 'accessibility-evidence',
    title: 'Accessibility automation evidence',
    description:
      'Accessibility helper, axe/focus checks, and critical-route evidence.',
    path: 'docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md',
    status: 'complete',
    category: 'qa-uat',
    riskNote: 'Manual screen-reader and mobile reviews remain hardening.',
    safeToQuote: true,
  },
  {
    id: 'backup-restore-evidence',
    title: 'Backup and restore evidence',
    description: 'PostgreSQL backup, restore, and restore-smoke proof.',
    path: 'docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md',
    status: 'complete',
    category: 'deployment',
    riskNote: 'MinIO/object backup automation remains hardening.',
    safeToQuote: true,
  },
  {
    id: 'summary-dto-evidence',
    title: 'Summary DTO evidence',
    description:
      'Dashboard, procurement, and finance summary DTO and UI evidence.',
    path: 'docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md',
    status: 'complete',
    category: 'qa-uat',
    riskNote: 'Advanced trends and analytics remain hardening.',
    safeToQuote: true,
  },
  {
    id: 'graph-overlay-evidence',
    title: 'Graph overlay evidence',
    description:
      'Graph anchor overlay, risk metadata, saved views, URL filters, and no-leak E2E evidence.',
    path: 'docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md',
    status: 'complete',
    category: 'qa-uat',
    riskNote: 'Annotations and persisted drag/drop positions remain graph hardening until implemented.',
    safeToQuote: true,
  },
  {
    id: 'fabric-proof-screen',
    title: 'Fabric proof screenshot',
    description: 'Reviewer screenshot of the hash-record verification page.',
    path: 'docs/evidence/uat/fabric-gateway-hash-record-verification.png',
    status: 'complete',
    category: 'screenshots',
    riskNote: 'Screenshot is evidence-backed; do not replace with mock proof screenshot.',
    safeToQuote: true,
  },
  {
    id: 'fabric-proof-panel-screen',
    title: 'Fabric proof panel screenshot',
    description: 'Reviewer screenshot of the Gateway proof panel.',
    path: 'docs/evidence/uat/fabric-gateway-proof-panel.png',
    status: 'complete',
    category: 'screenshots',
    riskNote: 'Screenshot is tied to VM-local FYP/UAT Fabric proof.',
    safeToQuote: true,
  },
  {
    id: 'guided-demo-screen',
    title: 'Guided Demo Mode screenshot',
    description: 'Screenshot of the in-app guided reviewer checklist.',
    path: 'docs/evidence/uat/guided-demo-mode.png',
    status: 'complete',
    category: 'screenshots',
    riskNote: 'Checklist state is local reviewer state only.',
    safeToQuote: true,
  },
  {
    id: 'reports-json-screen',
    title: 'Reports JSON export screenshot',
    description: 'Screenshot of the JSON report export flow.',
    path: 'docs/evidence/uat/reports-json-export-flow.png',
    status: 'complete',
    category: 'screenshots',
    riskNote: 'CSV/PDF/spreadsheet screenshots should be added only after those formats are implemented.',
    safeToQuote: true,
  },
  {
    id: 'loss-exception-screen',
    title: 'Loss exception reviewer screenshot',
    description: 'Screenshot of the loss exception reviewer workflow.',
    path: 'docs/evidence/uat/loss-exception-review-flow.png',
    status: 'complete',
    category: 'screenshots',
    riskNote: 'No guaranteed fixed-return claim should be inferred from this screenshot.',
    safeToQuote: true,
  },
  {
    id: 'graph-saved-view-screen',
    title: 'Graph saved-view screenshot',
    description: 'Screenshot of graph risk and saved-view behavior.',
    path: 'docs/evidence/uat/graph-risk-saved-view.png',
    status: 'complete',
    category: 'screenshots',
    riskNote: 'Role-filtered no-leak behavior is covered separately in graph evidence.',
    safeToQuote: true,
  },
  {
    id: 'deployment-blocker-resolved',
    title: 'Resolved VM deployment blocker',
    description:
      'Resolved blocker note for the initial stale Docker container conflict.',
    path: 'docs/evidence/blockers/2026-06-06-phase-1-slice-1-4-blocker.md',
    status: 'resolved-blocker',
    category: 'blockers',
    riskNote: 'Resolved blocker retained for traceability.',
    safeToQuote: true,
  },
  {
    id: 'fabric-runtime-blocker-resolved',
    title: 'Resolved Fabric runtime blocker',
    description:
      'Resolved blocker note for VM-local Fabric runtime and proof setup.',
    path: 'docs/evidence/blockers/2026-06-06-phase-2-slice-2-2-blocker.md',
    status: 'resolved-blocker',
    category: 'blockers',
    riskNote: 'Resolved blocker retained for traceability.',
    safeToQuote: true,
  },
  {
    id: 'remaining-hardening',
    title: 'Remaining evidence gaps',
    description:
      'Production OIDC, PDF/spreadsheet reports, MinIO backup, external integrations, and manual accessibility remain hardening work.',
    path: 'docs/evidence/EVIDENCE_INDEX.md#remaining-evidence-gaps',
    status: 'production-hardening',
    category: 'remaining-gaps',
    riskNote: 'These gaps are not blockers for the current FYP review package.',
    safeToQuote: true,
  },
  {
    id: 'evidence-safety-rule',
    title: 'Evidence safety rule',
    description:
      'Evidence must exclude raw secret material, generated runtime files, provider credentials, and VM credentials.',
    path: 'docs/evidence/EVIDENCE_INDEX.md#safety-rule',
    status: 'complete',
    category: 'safety',
    riskNote: 'Use curated evidence links only; do not paste raw credential files.',
    safeToQuote: true,
  },
]

export const evidencePackageCategories: readonly EvidencePackageCategory[] = [
  'roadmap-validation',
  'deployment',
  'fabric-hash',
  'qa-uat',
  'screenshots',
  'blockers',
  'remaining-gaps',
  'safety',
]

export function evidenceCategoryLabel(category: EvidencePackageCategory) {
  return category
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
