export type DemoGuideFeatureArea =
  | 'dashboard'
  | 'procurement'
  | 'finance'
  | 'evidence'
  | 'fabric'
  | 'graph'
  | 'reports'
  | 'operations'
  | 'review-package'

export type DemoGuideRiskLevel = 'low' | 'medium' | 'environment-gated'

export type DemoGuideCompletionMode =
  | 'manual-review'
  | 'route-visited'
  | 'evidence-backed'
  | 'environment-gated'

export type DemoGuideStep = {
  id: string
  title: string
  shortDescription: string
  route: string
  expectedVisibleText?: string
  expectedSelector?: string
  featureArea: DemoGuideFeatureArea
  riskLevel: DemoGuideRiskLevel
  evidenceLinks: string[]
  reviewerNotes: string
  completionMode: DemoGuideCompletionMode
  optional?: boolean
}

export const demoGuideSteps: readonly DemoGuideStep[] = [
  {
    id: 'dashboard-overview',
    title: 'Dashboard overview',
    shortDescription:
      'Review the role-aware dashboard, health cards, task queue, and backend summary indicators.',
    route: '/dashboard',
    expectedVisibleText: 'System health dashboard',
    featureArea: 'dashboard',
    riskLevel: 'low',
    evidenceLinks: [
      'docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md',
      'docs/evidence/uat/summary-procurement-hub.png',
    ],
    reviewerNotes:
      'This step is read-only and uses backend summary DTOs. It should not be treated as proof of external integrations.',
    completionMode: 'route-visited',
  },
  {
    id: 'procurement-hub-summary',
    title: 'Procurement Hub summary',
    shortDescription:
      'Inspect procurement metrics, queue items, blockers, and drill-down links.',
    route: '/procurement/projects',
    expectedVisibleText: 'Procurement Hub',
    featureArea: 'procurement',
    riskLevel: 'low',
    evidenceLinks: [
      'docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md',
      'docs/evidence/uat/summary-procurement-hub.png',
    ],
    reviewerNotes:
      'Use this step to confirm production routes consume API-backed summary data rather than copied prototype data.',
    completionMode: 'route-visited',
  },
  {
    id: 'source-to-pay-flow',
    title: 'Procurement source-to-pay flow',
    shortDescription:
      'Walk through requisition, approval, sourcing, purchase order, invoice, and matching surfaces.',
    route: '/procurement/requisitions',
    expectedVisibleText: 'Requisitions',
    featureArea: 'procurement',
    riskLevel: 'medium',
    evidenceLinks: [
      'tests/e2e/04-procurement-flow.spec.ts',
      'tests/e2e/11-procurement-operational.spec.ts',
    ],
    reviewerNotes:
      'This guide links existing workflow pages only. It does not auto-create requisitions or advance approvals.',
    completionMode: 'manual-review',
  },
  {
    id: 'finance-opportunities',
    title: 'Finance opportunities',
    shortDescription:
      'Review opportunity eligibility, blocked-state explanations, and finance summary readiness.',
    route: '/finance/opportunities',
    expectedVisibleText: 'Finance Opportunities',
    featureArea: 'finance',
    riskLevel: 'medium',
    evidenceLinks: [
      'docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md',
      'docs/evidence/uat/summary-finance-panel.png',
    ],
    reviewerNotes:
      'Eligibility remains backend-enforced. The guide must not imply non-revenue opportunities can progress.',
    completionMode: 'route-visited',
  },
  {
    id: 'application-workspace',
    title: 'Mudarabah application workspace',
    shortDescription:
      'Inspect lifecycle, evidence, due diligence, Shariah review, contract, disbursement, ledger, and closure panels.',
    route: '/finance/applications',
    expectedVisibleText: 'Applications',
    featureArea: 'finance',
    riskLevel: 'medium',
    evidenceLinks: [
      'tests/e2e/06-mudarabah-application-flow.spec.ts',
      'tests/e2e/07-closure-pack-flow.spec.ts',
    ],
    reviewerNotes:
      'The workspace must preserve backend workflow guardrails and no-guaranteed-fixed-return behavior.',
    completionMode: 'manual-review',
  },
  {
    id: 'loss-exception-workflow',
    title: 'Loss exception workflow',
    shortDescription:
      'Review genuine commercial loss classification, rationale capture, and closure gate behavior.',
    route: '/finance/applications',
    expectedVisibleText: 'Applications',
    featureArea: 'finance',
    riskLevel: 'medium',
    evidenceLinks: [
      'docs/evidence/qa/LOSS_EXCEPTION_WORKFLOW_EVIDENCE.md',
      'docs/evidence/uat/loss-exception-review-flow.png',
    ],
    reviewerNotes:
      'This step is evidence-backed for the FYP scope. Legal/Shariah thresholds remain product hardening.',
    completionMode: 'evidence-backed',
  },
  {
    id: 'fabric-proof-panel',
    title: 'Fabric hash-record proof panel',
    shortDescription:
      'Inspect the reviewer-facing proof that distinguishes mock, pending, failed, unavailable, and verified Fabric states.',
    route: '/evidence/hashes',
    expectedVisibleText: 'Hash Verification',
    featureArea: 'fabric',
    riskLevel: 'environment-gated',
    evidenceLinks: [
      'docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md',
      'docs/evidence/uat/fabric-gateway-hash-record-verification.png',
      'docs/evidence/uat/fabric-gateway-proof-panel.png',
    ],
    reviewerNotes:
      'Real proof is environment-gated. Do not mark mock or locally stored metadata as on-chain verification.',
    completionMode: 'environment-gated',
    optional: true,
  },
  {
    id: 'graph-anchor-risk-overlay',
    title: 'Graph anchor, risk, and saved-view overlay',
    shortDescription:
      'Review role-filtered network canvas, risk metadata, hash/anchor overlay, URL filters, and saved views.',
    route: '/graph/projects',
    expectedVisibleText: 'Project network canvas',
    featureArea: 'graph',
    riskLevel: 'medium',
    evidenceLinks: [
      'docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md',
      'docs/evidence/uat/graph-risk-saved-view.png',
    ],
    reviewerNotes:
      'Graph visibility must remain permission-filtered. Hidden finance context must not leak through labels, tooltips, or saved views.',
    completionMode: 'manual-review',
  },
  {
    id: 'reports-json-export',
    title: 'Reports JSON export',
    shortDescription:
      'Review backend report DTOs and audited JSON export/download behavior.',
    route: '/reports',
    expectedVisibleText: 'Reports',
    featureArea: 'reports',
    riskLevel: 'low',
    evidenceLinks: [
      'docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md',
      'docs/evidence/uat/reports-json-export-flow.png',
    ],
    reviewerNotes:
      'JSON export is implemented. PDF and spreadsheet formats remain production hardening until explicitly added.',
    completionMode: 'evidence-backed',
  },
  {
    id: 'operations-health-status',
    title: 'Operations health and status',
    shortDescription:
      'Inspect API health, outbox, reconciliation, worker heartbeat, and deployment runbook visibility.',
    route: '/operations',
    expectedVisibleText: 'Operations Health',
    featureArea: 'operations',
    riskLevel: 'low',
    evidenceLinks: [
      'docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md',
      'docs/evidence/deployment/latest-vm-deployment-evidence.txt',
    ],
    reviewerNotes:
      'Operations status is reviewer-facing and must not expose raw payloads, env values, PEM material, or secrets.',
    completionMode: 'route-visited',
  },
  {
    id: 'evidence-index-package',
    title: 'Evidence index and reviewer package',
    shortDescription:
      'Use the evidence index and final validation matrix as the source for screenshots, commands, blockers, and limitations.',
    route: '/reports',
    expectedVisibleText: 'Reports',
    featureArea: 'review-package',
    riskLevel: 'low',
    evidenceLinks: [
      'docs/evidence/EVIDENCE_INDEX.md',
      'docs/testing/final-validation-matrix.md',
      'docs/roadmap/soon-to-be-feature-implementation-report.md',
    ],
    reviewerNotes:
      'This step links committed evidence artifacts. It should not display local filesystem contents or secret-bearing raw logs at runtime.',
    completionMode: 'manual-review',
  },
]

export function getDemoGuideStepById(stepId: string) {
  return demoGuideSteps.find((step) => step.id === stepId)
}
