# MEPN Evidence Index

## Purpose

This index is the reviewer entry point for implementation, deployment, UAT, and
known-limitation evidence. It links only to sanitized evidence; secret values,
PEM blocks, private keys, tokens, generated env files, and VM credentials must
not be stored in this directory.

## Roadmap And Validation

| Evidence | Purpose | Status |
|---|---|---|
| `docs/roadmap/soon-to-be-feature-implementation-report.md` | Final implementation report for the soon-to-be feature round, including phase results, commits, validation, and remaining hardening work. | Complete. |
| `docs/roadmap/ui-hci-recovery-workstream-report.md` | Multi-agent UI/HCI recovery and route-health workstream report. | Complete for latest reviewer-delighter sprint. |
| `docs/roadmap/feature-status-and-future-implementation.md` | Current feature status roadmap and phase/slice tracker. | Complete for latest reconciliation. |
| `docs/testing/final-validation-matrix.md` | Final validation command matrix and latest full regression result summary. | Complete for latest local regression pass. |

## Deployment Evidence

| Evidence | Purpose | Status |
|---|---|---|
| `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md` | Azure Student VM deployment checklist, health checks, and Fabric Gateway deployment status. | Complete for latest recorded VM deployment. |
| `docs/evidence/deployment/latest-vm-deployment-evidence.txt` | Sanitized collected VM output from the deployment evidence script. | Complete; safe to quote with normal review caution. |
| `docs/evidence/deployment/FABRIC_SECRET_MAPPING_AUDIT.md` | Confirms configured GitHub secret names, VM file layout, and read-only container mount contract. | Complete. |
| `docs/evidence/deployment/FABRIC_SECRET_VALIDATION_EVIDENCE.md` | Records safe validation behavior for Fabric cert/key/TLS/profile material without printing contents. | Complete. |
| `docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md` | PostgreSQL backup, restore, and restore-smoke proof for the FYP scope. | Complete for PostgreSQL; MinIO automation remains hardening. |

## Fabric And Hash Evidence

| Evidence | Purpose | Status |
|---|---|---|
| `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md` | Reviewer proof package for real Gateway anchoring and API-side `ReadAnchor` verification. | Complete for VM-local FYP/UAT Fabric proof. |
| `docs/evidence/qa/FABRIC_CONSORTIUM_GOVERNANCE_EVIDENCE.md` | Operator-assisted Fabric consortium governance metadata, proposal, invitation, approval, readiness, and sanitized evidence workflow. | Complete for metadata/operator-assisted FYP scope; direct Fabric topology automation remains hardening. |
| `docs/evidence/canonical-hash-verification.md` | Canonical hashing behavior and verification reference. | Source-of-truth support document. |
| `docs/evidence/uat/fabric-gateway-hash-record-verification.png` | Reviewer screenshot of the hash-record verification page. | Captured. |
| `docs/evidence/uat/fabric-gateway-proof-panel.png` | Reviewer screenshot of Gateway proof panel. | Captured. |

## QA / UAT Evidence

| Evidence | Purpose | Status |
|---|---|---|
| `docs/evidence/qa/AUTH_OIDC_INVITATION_UAT_EVIDENCE.md` | Auth mode, dev-login guard, OIDC test-provider, and invite acceptance evidence. | Partial; real provider UAT remains hardening. |
| `docs/evidence/qa/GUIDED_DEMO_MODE_EVIDENCE.md` | In-app guided reviewer checklist for the FYP demo path. | Complete after latest guided demo E2E screenshot capture. |
| `docs/evidence/qa/EVIDENCE_PACKAGE_BROWSER_EVIDENCE.md` | Read-only in-app reviewer evidence package browser. | Complete after latest evidence browser E2E screenshot capture. |
| `docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md` | Backend report DTO and audited JSON/CSV export evidence. | Complete for JSON and CSV FYP scope. |
| `docs/evidence/qa/OPERATIONS_TIMELINE_EVIDENCE.md` | Backend-backed operations timeline for outbox, reconciliation, Fabric, reports, and worker events. | Complete after latest operations timeline E2E screenshot capture. |
| `docs/evidence/qa/LOSS_EXCEPTION_WORKFLOW_EVIDENCE.md` | Loss exception classification, reviewer UI, closure gate, and no-guaranteed-return evidence. | Complete for FYP scope. |
| `docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md` | Accessibility helper, axe/focus checks, and critical-route evidence. | Complete for automated FYP scope. |
| `docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md` | Dashboard/procurement/finance summary DTO and UI evidence. | Complete for FYP scope. |
| `docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md` | Graph anchor overlay, backend risk metadata, saved views, URL filters, and no-leak E2E evidence. | Complete for FYP scope. |
| `docs/evidence/uat/USE_CASE_BLOCKERS.md` | SRS use-case UAT blocker and limitation register for UC-01 through UC-18. | Current for local node UAT simulation. |
| `docs/evidence/uat/USE_CASE_SIMULATION_RESULTS.md` | SRS use-case UAT runner, latest local result, screenshot paths, and safety notes. | Passed locally for UC-01 through UC-18. |
| `docs/evidence/uat/FABRIC_UAT_BLOCKER_DECISIONS.md` | Accepted UAT-B-003/UAT-B-004 decision evidence, `/fabric-governance` decision UI, and validation commands. | Complete for local UAT decision boundary; live proof evidence remains environment-gated. |
| `docs/evidence/uat/seeded-node-accounts.txt` | Seeded organization-node account list and local/demo password reference. | Complete for local/UAT reviewer use; not production credential behavior. |
| `docs/evidence/uat/BUSINESS_ACTIVITY_SIMULATION.md` | Multi-node per-user business activity simulation using UAT-labelled audit and inbox records. | Complete for local/UAT simulation boundary; does not claim real Fabric proof or real payment execution. |
| `docs/evidence/uat/MULTI_NODE_FEDERATION_RESULTS.md` | Multi-node federation implementation evidence, including isolated one-organization seed validation and Docker/start scaffolding. | Partial; API federation, channel sync, canvas, and screenshots remain in progress. |
| `docs/evidence/uat/MULTI_NODE_FEDERATION_BLOCKERS.md` | Blocker and open-item register for the multi-node federation workstream. | Current; no active blocker for the isolated seed slice. |
| `docs/evidence/ux/UI_ROUTE_HEALTH_AUDIT.md` | Route-health audit for dashboard, finance, graph, and operations routes. | Complete for latest UI/HCI recovery run. |
| `docs/evidence/ux/HCI_ASSESSMENT_ACTIVITY_REPORT.md` | HCI assessment boundary, DECIDE-aligned activity plan, and metric rules. | Prepared; participant scoring remains unmeasured. |
| `docs/evidence/ux/HCI_COGNITIVE_WALKTHROUGH.md` | Cognitive walkthrough workflow mapping and evidence rules. | Prepared with Playwright instrumentation evidence. |
| `docs/evidence/ux/HCI_HEURISTIC_EVALUATION.md` | Heuristic evaluation worksheet for MEPN reviewer surfaces. | Prepared; findings require reviewer assessment. |
| `docs/evidence/ux/HCI_ACTION_PLAN.md` | UX remediation action plan and metric-governance checklist. | Prepared. |
| `docs/evidence/ux/SCREENSHOT_INDEX.md` | Index of route-health, cognitive-walkthrough, and HCI screenshot evidence. | Complete for latest screenshot capture. |

## Screenshot Evidence

| Screenshot | Scenario |
|---|---|
| `docs/evidence/uat/auth-login-dev-mode.png` | Demo/dev login mode. |
| `docs/evidence/uat/auth-login-seeded-password.png` | Seeded local password login mode. |
| `docs/evidence/uat/auth-invitation-acceptance.png` | Invitation acceptance UI. |
| `docs/evidence/uat/guided-demo-mode.png` | Guided Demo Mode checklist overlay. |
| `docs/evidence/uat/evidence-package-browser.png` | Evidence Package Browser reviewer page. |
| `docs/evidence/uat/reports-json-export-flow.png` | JSON report export flow. |
| `docs/evidence/uat/reports-csv-export-flow.png` | CSV report export flow. |
| `docs/evidence/uat/operations-timeline.png` | Operations Timeline reviewer view. |
| `docs/evidence/uat/loss-exception-review-flow.png` | Loss exception reviewer workflow. |
| `docs/evidence/uat/summary-procurement-hub.png` | Procurement Hub summary DTO UI. |
| `docs/evidence/uat/summary-finance-panel.png` | Finance summary DTO UI. |
| `docs/evidence/uat/graph-anchor-overlay-auditor.png` | Admin/auditor graph with hash/anchor overlay. |
| `docs/evidence/uat/graph-anchor-overlay-procurement-filtered.png` | Procurement role graph with finance context hidden. |
| `docs/evidence/uat/graph-risk-saved-view.png` | Saved graph view restoring an anchor-only filtered view. |
| `docs/evidence/uat/screenshots/UC-01-install-node.png` | UC-01 self-hosted node setup/profile route. |
| `docs/evidence/uat/screenshots/UC-02-authenticate.png` | UC-02 seeded actor authentication/authorization route. |
| `docs/evidence/uat/screenshots/UC-03-onboard-supplier.png` | UC-03 supplier onboarding evidence route. |
| `docs/evidence/uat/screenshots/UC-04-rfq-evaluation.png` | UC-04 RFQ and supplier evaluation route. |
| `docs/evidence/uat/screenshots/UC-05-p2p.png` | UC-05 procure-to-pay matching route. |
| `docs/evidence/uat/screenshots/UC-06-publish-opportunity.png` | UC-06 opportunity publishing visibility route. |
| `docs/evidence/uat/screenshots/UC-07-apply-capital.png` | UC-07 mudarabah application visibility route. |
| `docs/evidence/uat/screenshots/UC-08-due-diligence.png` | UC-08 financier due diligence route. |
| `docs/evidence/uat/screenshots/UC-09-shariah-review.png` | UC-09 Shariah/compliance review route. |
| `docs/evidence/uat/screenshots/UC-10-contract-disburse.png` | UC-10 contract/disbursement route. |
| `docs/evidence/uat/screenshots/UC-11-monitor-execution.png` | UC-11 project ledger/monitoring route. |
| `docs/evidence/uat/screenshots/UC-12-profit-loss-close.png` | UC-12 profit/loss and closure route. |
| `docs/evidence/uat/screenshots/UC-13-network-canvas.png` | UC-13 supply-chain network canvas route. |
| `docs/evidence/uat/screenshots/UC-14-audit-evidence.png` | UC-14 audit/hash evidence route. |
| `docs/evidence/uat/screenshots/UC-15-erp-integration.png` | UC-15 ERP integration/reconciliation route. |
| `docs/evidence/uat/screenshots/UC-16-update-local-node.png` | UC-16 operations/update evidence route. |
| `docs/evidence/uat/screenshots/UC-17-channel-join-package.png` | UC-17 Fabric governance package readiness route. |
| `docs/evidence/uat/screenshots/UC-18-node-compatibility.png` | UC-18 Fabric/node compatibility readiness route. |
| `docs/evidence/ux/screenshots/after-dashboard.png` | Dashboard route-health after screenshot. |
| `docs/evidence/ux/screenshots/after-finance-opportunities.png` | Finance opportunities route-health after screenshot. |
| `docs/evidence/ux/screenshots/after-finance-applications.png` | Finance applications route-health after screenshot and overflow fix proof. |
| `docs/evidence/ux/screenshots/after-finance-contracts.png` | Finance contracts route-health after screenshot. |
| `docs/evidence/ux/screenshots/after-graph-projects.png` | Graph projects route-health after screenshot. |
| `docs/evidence/ux/screenshots/after-operations.png` | Operations route-health after screenshot. |
| `docs/evidence/ux/screenshots/hci-dashboard-status-visibility.png` | HCI screenshot for visibility of system status. |
| `docs/evidence/ux/screenshots/hci-finance-approval-flow.png` | HCI screenshot for finance approval-flow clarity. |
| `docs/evidence/ux/screenshots/hci-contract-confirmation-state.png` | HCI screenshot for contract confirmation state. |
| `docs/evidence/ux/screenshots/hci-graph-information-density.png` | HCI screenshot for graph information density. |
| `docs/evidence/ux/screenshots/hci-operations-error-prevention.png` | HCI screenshot for operations error prevention. |

## Resolved Blockers

| Blocker | Resolution |
|---|---|
| `docs/evidence/blockers/2026-06-06-phase-1-slice-1-4-blocker.md` | Resolved. Azure VM deployment workflow completed and sanitized evidence was collected. |
| `docs/evidence/blockers/2026-06-06-phase-2-slice-2-2-blocker.md` | Resolved. VM-local Fabric runtime produced real Gateway proof and reviewer screenshots. |

## Remaining Evidence Gaps

| Gap | Classification | Next action |
|---|---|---|
| Real production OIDC provider UAT | Production hardening | Configure agreed provider, run callback/invite UAT, and update auth evidence. |
| PDF/spreadsheet report packs | Product hardening | Implement downloadable PDF/spreadsheet artifacts and capture evidence. |
| MinIO/object backup automation | Operations hardening | Extend backup/restore scripts beyond PostgreSQL. |
| External ERP/e-sign/payment provider integrations | External integration hardening | Implement real adapters and collect sanitized provider evidence. |
| Manual screen-reader/mobile accessibility review | QA hardening | Run manual review and add notes/screenshots. |

## Safety Rule

Evidence may include public route names, non-secret test IDs, commit SHAs, and
sanitized command output. Evidence must not include secret contents, PEM blocks,
private keys, tokens, passwords, generated secret env files, or VM credentials.
