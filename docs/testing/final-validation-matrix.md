# Final Validation Matrix

## Purpose

This matrix maps MEPN verification commands to feature coverage and evidence.
Use it before release/demo handoff and update the `Result` column after every
full regression pass. Do not mark environment-gated checks as passed unless the
required runtime is actually available.

## Core Commands

| Command | Purpose | Coverage | Latest result | Evidence / notes |
|---|---|---|---|---|
| `corepack pnpm lint` | Static lint and workspace TypeScript checks for non-web packages. | All apps/packages; formatting via ESLint `--fix` where configured. | Passed in UI/HCI recovery aggregation final validation. | Also passed inside `test:ci` and `verify`. |
| `corepack pnpm typecheck` | Web TypeScript project build check. | Frontend routes, shared types, API client type use. | Passed in UI/HCI recovery aggregation final validation. | Root script currently runs `apps/web` typecheck. |
| `corepack pnpm test:unit` | Workspace unit tests. | API services/helpers, worker adapters, frontend component/model tests. | Passed in UI/HCI recovery aggregation final validation. | API: 27 suites / 120 tests; web: 25 files / 113 tests; worker: 8 suites / 23 tests. |
| `corepack pnpm test:integration` | API and worker integration tests. | Prisma-backed workflow/API behavior, worker integrations. | Passed in UI/HCI recovery aggregation final validation. | API: 14 suites / 37 tests; worker: 4 suites passed and 1 real-Fabric gated suite skipped. Existing `pg@9` deprecation warning remains non-blocking. |
| `corepack pnpm test:e2e` | Full Playwright UAT/regression suite. | Login, dashboard, procurement, evidence/audit, finance, graph, reports, accessibility-gated flows, route health, HCI screenshots. | Passed in UI/HCI recovery aggregation final validation. | 45 passed, 1 intentionally skipped real-Gateway UAT proof spec because live UAT env vars were not set; Phase 2 records real Gateway screenshot evidence separately. |
| `corepack pnpm test:a11y` | Accessibility smoke route. | Axe/focus helper and login smoke route. | Passed in UI/HCI recovery aggregation final validation. | Critical-route accessibility specs also passed inside full E2E. |
| `corepack pnpm build` | Production builds. | Web Vite build, API Nest build, worker Nest build. | Passed in UI/HCI recovery aggregation final validation. | Vite chunk-size warning is non-blocking. |
| `corepack pnpm test:ci` | CI-equivalent regression command. | Lint, unit, integration, E2E. | Passed in UI/HCI recovery aggregation final validation. | Re-ran lint, unit, integration, and full E2E successfully. |
| `corepack pnpm verify` | Local verify command. | Lint, typecheck, workspace tests, build. | Passed in UI/HCI recovery aggregation final validation. | `verify` does not run E2E; E2E remains recorded separately above. |

## Targeted Feature Checks

| Command | Feature coverage | Latest result | Evidence |
|---|---|---|---|
| `corepack pnpm --dir apps/api test:unit -- graph` | Graph risk metadata, filters, saved-view service validation. | Passed in Phase 9.5. | `docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md` |
| `corepack pnpm --dir apps/api test:integration -- graph` | Graph API no-leak behavior, filter query params, saved-view CRUD/permission checks. | Passed in Phase 9.5. | `docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md` |
| `corepack pnpm --dir apps/web test -- graph` | Graph model mapping, role filtering, inspector risk reasons, legends. | Passed in Phase 9.5. | `docs/evidence/qa/GRAPH_ANCHOR_OVERLAY_E2E_EVIDENCE.md` |
| `corepack pnpm test:e2e -- tests/e2e/12-read-only-project-graph.spec.ts` | Graph browser path, URL filters, saved views, anchor overlay, role no-leak assertions. | Passed in Phase 9.6. | `docs/evidence/uat/graph-risk-saved-view.png` |
| `corepack pnpm test:e2e -- tests/e2e/15-fabric-gateway-uat-proof.spec.ts` | Real Fabric Gateway proof panel screenshots. | Environment-gated. | `docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md` |
| `corepack pnpm test:e2e -- tests/e2e/16-reports-export-flow.spec.ts` | Report DTO UI and audited JSON export flow. | Previously passed during reports phase. | `docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md` |
| `corepack pnpm test:e2e -- tests/e2e/17-loss-exception-workflow.spec.ts` | Loss exception classification, closure gate, reviewer UI. | Previously passed during loss-exception phase. | `docs/evidence/qa/LOSS_EXCEPTION_WORKFLOW_EVIDENCE.md` |
| `corepack pnpm test:e2e -- tests/e2e/19-critical-route-accessibility.spec.ts` | Critical-route axe/focus accessibility coverage. | Previously passed during accessibility phase. | `docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md` |
| `corepack pnpm test:e2e -- tests/e2e/20-summary-api-ui.spec.ts` | Procurement and finance summary DTO UI. | Previously passed during summary phase. | `docs/evidence/qa/SUMMARY_DTO_EVIDENCE.md` |
| `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` | Dashboard, finance, graph, and operations route-health regression. | Passed in UI/HCI recovery aggregation; 7 checks passed. | `docs/evidence/ux/UI_ROUTE_HEALTH_AUDIT.md` |
| `corepack pnpm test:e2e -- tests/e2e/20-hci-walkthrough.spec.ts` | Playwright-instrumented HCI cognitive walkthrough route timing and error-count capture. | Passed in UI/HCI recovery aggregation. | `docs/evidence/ux/hci-walkthrough-instrumentation.json`; `docs/evidence/ux/HCI_COGNITIVE_WALKTHROUGH.md` |
| `corepack pnpm test:e2e -- tests/e2e/21-hci-screenshot-capture.spec.ts` | Safe HCI screenshot capture for reviewer routes and heuristic focus areas. | Passed in UI/HCI recovery aggregation. | `docs/evidence/ux/SCREENSHOT_INDEX.md` |

## Deployment / Operations Checks

| Command | Purpose | Result status | Evidence / notes |
|---|---|---|---|
| `bash scripts/validate-fabric-secrets.sh /run/secrets/fabric` | Validate deployed Fabric cert/key/TLS/profile layout without printing contents. | Passed in recorded VM evidence. | `docs/evidence/deployment/FABRIC_SECRET_VALIDATION_EVIDENCE.md` |
| `bash scripts/smoke/fabric-gateway-smoke.sh` | Smoke app health and optional hash-record Fabric verification. | Passed for configured VM status; hash verification requires a live ID. | `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md` |
| `bash scripts/evidence/collect-vm-deployment-evidence.sh` | Collect sanitized VM deployment health/evidence. | Passed in recorded VM evidence. | `docs/evidence/deployment/latest-vm-deployment-evidence.txt` |
| `bash scripts/backup/backup-postgres.sh ...` | Produce PostgreSQL backup artifact. | Passed in backup proof phase. | `docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md` |
| `bash scripts/backup/restore-postgres.sh ... --yes` | Restore PostgreSQL backup to disposable target. | Passed in backup proof phase. | `docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md` |
| `bash scripts/backup/smoke-restore.sh ...` | Validate restored database schema and demo records. | Passed in backup proof phase. | `docs/evidence/deployment/BACKUP_RESTORE_EVIDENCE.md` |

## Failure Recording Rule

If a command fails and cannot be safely fixed in the current slice, create a
blocker note under:

```text
docs/evidence/blockers/YYYY-MM-DD-<phase>-<slice>-blocker.md
```

The note must include the command attempted, sanitized output, blocker type,
implemented work, remaining work, exact resume steps, and whether evidence is
safe to commit.
