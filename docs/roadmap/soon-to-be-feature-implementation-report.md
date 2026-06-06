# Soon-To-Be Feature Implementation Report

## Purpose

This report closes the implementation round that expanded
`docs/roadmap/feature-status-and-future-implementation.md`.

It records what was implemented for the FYP review scope, what evidence exists,
what validation passed, and what remains as production-hardening work. It does
not claim real production readiness for external providers, managed identity,
regulatory reporting, consortium Fabric governance, or enterprise operations.

## Executive Summary

The original soon-to-be feature set has been implemented for review/demo scope
except for items intentionally classified as production hardening. The current
repository now includes:

- Azure VM deployment evidence with sanitized Fabric Gateway secret handling.
- Real VM-local Fabric Gateway UAT proof using API-side chaincode `ReadAnchor`
  verification and reviewer screenshots.
- Production-safe auth direction: dev login is guarded, invitation persistence
  stores token hashes, invitation APIs exist, and OIDC test-provider flow exists.
- Backend-owned reports DTOs with audited JSON report exports and UI download
  flow.
- Backend-owned loss exception lifecycle, reviewer workflow, closure gate, audit
  and outbox events.
- Automated accessibility checks for demo-critical routes.
- PostgreSQL backup, restore, and restore smoke scripts with runbook/evidence.
- Backend-owned dashboard, procurement, and finance summaries with UI
  integration.
- Graph risk metadata, URL filters, saved views, hash/anchor overlays, and
  role-filtered no-leak E2E evidence.
- Final evidence index and final validation matrix.

## Source-Of-Truth Compliance

- SRS/SDD and UI contract docs remain the authoritative behavior references.
- Figma Make remains a visual and interaction reference only.
- Critical workflow rules were moved into backend/API services where implemented.
- Mock/demo paths remain available for deterministic tests, but mock Fabric
  anchors are not represented as real on-chain proof.
- Fabric `verified=true` requires API-side chaincode verification and hash
  comparison, not stored metadata alone.
- Mudarabah flows do not calculate or present guaranteed fixed return logic.
- Secret values, PEM blocks, private keys, tokens, generated secret env files,
  and VM credentials were not committed.

## Phase Completion Summary

| Phase | Result | Key evidence |
|---|---|---|
| 0 Roadmap reconciliation | Complete | `docs/roadmap/feature-status-and-future-implementation.md` |
| 1 Azure VM Fabric deployment evidence | Complete | `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md`, `docs/evidence/deployment/latest-vm-deployment-evidence.txt` |
| 2 Real Fabric proof screenshots | Complete for VM-local FYP/UAT proof | `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md`, `docs/evidence/uat/fabric-gateway-*.png` |
| 3 Production OIDC/invitation flow | Complete for guarded dev auth, invitation lifecycle, and test-provider OIDC path; real-provider deployment remains hardening | `docs/evidence/qa/AUTH_OIDC_INVITATION_UAT_EVIDENCE.md` |
| 4 Reports DTOs and exports | Complete for backend DTOs and audited JSON export scope | `docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md` |
| 5 Loss exception workflow | Complete for FYP reviewer workflow and backend closure gate | `docs/evidence/qa/LOSS_EXCEPTION_WORKFLOW_EVIDENCE.md` |
| 6 Accessibility automation | Complete for automated demo-critical route checks | `docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md` |
| 7 Backup/restore proof | Complete for PostgreSQL backup/restore/smoke proof | `docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md` |
| 8 Richer summaries | Complete for backend-owned dashboard/procurement/finance summary DTOs and UI integration | `docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md` |
| 9 Graph saved views and risk scoring | Complete for backend risk metadata, URL filters, saved views, and role no-leak evidence | `docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md` |
| 10 Final consolidation | Complete through validation pass; this report completes the final reporting slice | `docs/evidence/EVIDENCE_INDEX.md`, `docs/testing/final-validation-matrix.md` |

## Commit Trace

Representative commits for this round:

| Phase | Commits |
|---|---|
| 0 | `90a69b7 docs(roadmap): reconcile soon-to-be repository state`; `35cdfe1 docs(roadmap): add phased implementation slices`; `a309bc8 docs(roadmap): add soon-to-be implementation tracker` |
| 1 | `d6776e2 chore(deploy): verify fabric gateway secret mapping`; `d0f6b0d chore(deploy): harden fabric secret validation`; `bdb8844 chore(evidence): sanitize vm deployment evidence collection`; `7c5fe9a chore(deploy): record azure vm fabric deployment evidence`; `d5e5833 docs(roadmap): update azure vm deployment status` |
| 2 | `5c93a91 test(fabric): verify gateway proof api and ui readiness`; `b464610 chore(fabric): add vm local fabric runtime scripts`; `220737b test(uat): capture vm local fabric gateway proof screenshots`; `b6fb9e8 docs(evidence): resolve fabric gateway runtime blocker` |
| 3 | `1e32490 feat(auth): guard dev login behind environment config`; `d4eb24e feat(auth): add invitation persistence model`; `21e82f6 feat(auth): add invitation lifecycle api`; `bc32745 feat(auth): add oidc login callback flow`; `ab73418 feat(auth): add production login and invite acceptance ui`; `a92c1f4 docs(auth): document oidc invitation uat evidence` |
| 4 | `679ddf7 feat(reports): add aggregate report dtos`; `5687258 feat(reports): add report export job model`; `d019970 feat(reports): add audited json report exports`; `8a2e8b8 feat(reports): connect reports ui to export api`; `2ac0c03 docs(reports): document report dto export evidence` |
| 5 | `0fcd4a7 docs(finance): define loss exception workflow contract`; `564c1cf feat(finance): add loss exception domain model`; `f253b07 feat(finance): add loss exception api`; `8524073 feat(finance): enforce loss exception closure gate`; `a516603 feat(finance): add loss exception review ui`; `fd79e65 docs(finance): record loss exception workflow evidence` |
| 6 | `ffcee4b test(a11y): add accessibility test helper`; `8953845 fix(a11y): resolve critical route accessibility issues`; `0c58c2a docs(a11y): document accessibility automation evidence` |
| 7 | `916ad53 docs(deploy): define backup restore scope`; `c338610 chore(backup): add postgres backup script`; `eec189d chore(backup): add postgres restore script`; `6b6b44f chore(backup): add restore smoke proof`; `e46701c docs(deploy): add backup restore runbook evidence` |
| 8 | `ce75034 feat(summary): define dashboard procurement finance dto contracts`; `0019eb1 feat(summary): add role aware dashboard summary`; `2a1959a feat(procurement): add procurement summary dto`; `bb4175e feat(finance): add finance summary dto`; `5ffbdce feat(summary): connect dashboard procurement finance ui`; `8762bb0 docs(summary): document richer summary dto evidence` |
| 9 | `ebf60a6 docs(graph): define graph risk scoring contract`; `302ee82 feat(graph): add backend risk metadata`; `452f449 feat(graph): add query param graph filters`; `fe0ab2a feat(graph): add saved graph views`; `17c237b feat(graph): add risk overlay and saved view ui`; `2fdc842 docs(graph): document risk scoring saved view evidence` |
| 10 | `baf980e docs(roadmap): reconcile completed soon-to-be features`; `c614761 docs(evidence): add final evidence index`; `25caa01 docs(testing): add final validation matrix`; `e65db77 test(ci): record final validation pass` |

## New Or Updated Endpoints

Key API surfaces added or hardened during the round:

- `GET /api/v1/hash-records/:id/fabric-verification`
- `POST /api/v1/auth/invitations`
- `GET /api/v1/auth/invitations`
- `POST /api/v1/auth/invitations/:id/revoke`
- `GET /api/v1/auth/invitations/accept`
- `POST /api/v1/auth/invitations/accept`
- `GET /api/v1/auth/oidc/start`
- `GET /api/v1/auth/oidc/callback`
- `GET /api/v1/reports/summary`
- `GET /api/v1/reports/procurement`
- `GET /api/v1/reports/finance`
- `GET /api/v1/reports/audit`
- `GET /api/v1/reports/integrations`
- `POST /api/v1/reports/exports`
- `GET /api/v1/reports/exports/:id`
- `GET /api/v1/reports/exports/:id/download`
- `POST /api/v1/loss-exceptions`
- `GET /api/v1/loss-exceptions`
- `GET /api/v1/loss-exceptions/:id`
- `POST /api/v1/loss-exceptions/:id/evidence`
- `POST /api/v1/loss-exceptions/:id/decision`
- `POST /api/v1/loss-exceptions/:id/close`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/procurement/summary`
- `GET /api/v1/finance/summary`
- `GET /api/v1/graph/projects/:projectId` with filter query params
- `POST /api/v1/graph/views`
- `GET /api/v1/graph/views`
- `PATCH /api/v1/graph/views/:id`
- `DELETE /api/v1/graph/views/:id`

## New Or Updated Scripts

Operational scripts added or hardened:

- `scripts/deploy/write-fabric-secrets-on-vm.sh`
- `scripts/validate-fabric-secrets.sh`
- `scripts/smoke/fabric-gateway-smoke.sh`
- `scripts/evidence/collect-vm-deployment-evidence.sh`
- `infra/fabric/scripts/*` local and VM-local Fabric helpers
- `scripts/backup/backup-postgres.sh`
- `scripts/backup/restore-postgres.sh`
- `scripts/backup/smoke-restore.sh`

These scripts are designed to avoid printing secret contents. Evidence docs
store sanitized outputs or command summaries only.

## Evidence Package

Reviewer entry points:

- `docs/evidence/EVIDENCE_INDEX.md`
- `docs/testing/final-validation-matrix.md`
- `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md`
- `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md`
- `docs/evidence/qa/AUTH_OIDC_INVITATION_UAT_EVIDENCE.md`
- `docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md`
- `docs/evidence/qa/LOSS_EXCEPTION_WORKFLOW_EVIDENCE.md`
- `docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md`
- `docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md`
- `docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md`
- `docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md`

Key screenshot artifacts:

- `docs/evidence/uat/fabric-gateway-hash-record-verification.png`
- `docs/evidence/uat/fabric-gateway-proof-panel.png`
- `docs/evidence/uat/auth-login-dev-mode.png`
- `docs/evidence/uat/auth-invitation-acceptance.png`
- `docs/evidence/uat/reports-json-export-flow.png`
- `docs/evidence/uat/loss-exception-review-flow.png`
- `docs/evidence/uat/summary-procurement-hub.png`
- `docs/evidence/uat/summary-finance-panel.png`
- `docs/evidence/uat/graph-anchor-overlay-auditor.png`
- `docs/evidence/uat/graph-anchor-overlay-procurement-filtered.png`
- `docs/evidence/uat/graph-risk-saved-view.png`

## Final Validation Results

The Phase 10.4 regression pass completed successfully.

| Command | Result |
|---|---|
| `corepack pnpm lint` | Passed |
| `corepack pnpm typecheck` | Passed |
| `corepack pnpm test:unit` | Passed: API 24 suites / 103 tests; web 18 files / 92 tests; worker 8 suites / 23 tests |
| `corepack pnpm test:integration` | Passed: API 14 suites / 35 tests; worker 4 suites passed and 1 real-Fabric gated suite skipped |
| `corepack pnpm build` | Passed; Vite chunk-size warning is non-blocking |
| `corepack pnpm test:e2e` | Passed: 32 tests passed, 1 live-Gateway proof spec intentionally skipped without local UAT env vars |
| `corepack pnpm test:a11y` | Passed |
| `corepack pnpm test:ci` | Passed |
| `corepack pnpm verify` | Passed |

Notes:

- The skipped E2E test is the gated real-Gateway UAT proof. It is expected to
  skip in ordinary local runs unless live UAT hash-record environment variables
  are supplied.
- Real Gateway screenshot evidence was already captured in Phase 2 with a
  VM-local Fabric runtime and is linked from the evidence index.
- Integration test output includes a non-blocking `pg@9` deprecation warning
  about `client.query()` while already executing.

## Remaining Partial Features

These items are not blockers for the current FYP review package, but remain
before credible production readiness:

| Area | Remaining work | Resume document |
|---|---|---|
| Production OIDC | Configure and verify a real provider token exchange/callback, provider-specific invite UAT, and any MFA/password-policy decisions. | `docs/roadmap/product-hardening-backlog.md` |
| Reports | Add PDF/spreadsheet formats, scheduled packs, retention, and evidence-item registration. | `docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md` |
| Loss exceptions | Finalize legal/Shariah evidence thresholds, appeal/reopen governance, and exception analytics. | `docs/domain/loss-exception-workflow.md` |
| Accessibility | Add manual screen-reader review, mobile-specific audits, and optional separated CI reporting. | `docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md` |
| Backup/restore | Add MinIO/object backup automation, retention, scheduled backups, and off-VM storage. | `docs/deployment/backup-restore-runbook.md` |
| Graph | Add persisted node positions, annotations, team-curated default views, and time-based risk ageing if approved. | `docs/roadmap/graph-risk-scoring-contract.md` |
| External integrations | Add real ERP, e-signature, payment/finance provider adapters and sanitized provider evidence. | `docs/roadmap/product-hardening-backlog.md` |

## Blockers

No unresolved blockers remain for the implemented FYP review scope.

Resolved blockers:

- `docs/evidence/blockers/2026-06-06-phase-1-slice-1-4-blocker.md`
- `docs/evidence/blockers/2026-06-06-phase-2-slice-2-2-blocker.md`

Future work that requires external runtime/provider/operator action is tracked
as production hardening rather than as a current implementation blocker.

## Reviewer Conclusion

A reviewer can now inspect the roadmap, evidence index, validation matrix,
deployment docs, Fabric UAT proof, UAT screenshots, and final validation results
to assess the current implementation. The implementation is review-ready for the
student/demo FYP scope and explicitly separated from production-hardening work.
