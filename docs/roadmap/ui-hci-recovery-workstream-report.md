# UI/HCI Recovery Workstream Report

Date: 2026-06-06
Branch: `feature/reviewer-delighters-sprint-1`

## Summary

The UI/HCI recovery workstream ran in parallel worktrees after the reviewer-delighter baseline. The reported route failures were not reproduced as `Internal Server Error` failures under the route-health criteria. One real UI issue was found: `/finance/applications` could overflow horizontally at the Playwright desktop viewport and clip the `Open workspace` action. That layout issue was fixed.

Graph Annotation API work was completed first so graph-related route verification could run on the current graph backend contract.

## Agents And Outputs

| Agent | Branch / worktree | Completed work | Commits integrated | Tests / evidence |
| --- | --- | --- | --- | --- |
| Agent A - Graph Annotation API | `feature/reviewer-delighters-sprint-1` / `C:\Users\User\dev\FYP` | Added Graph Annotation API routes, target visibility checks, owner/admin mutation rules, and graph annotation unit/integration coverage. | `4d418f2 feat(graph): add graph annotation api` | Graph unit/integration, lint, typecheck, unit, integration, build passed. |
| Agent B - UI/HCI Baseline | `feature/ui-hci-recovery-baseline` / `C:\Users\User\dev\FYP-ui-hci-baseline` | Added route-health E2E regression and baseline audit. | `844361a test(e2e): add route health regression coverage`; `feed58e docs(ux): record ui hci baseline service health` | Route-health E2E passed for six reported routes; no before-error screenshots generated because routes were healthy. |
| Agent C - Dashboard + Finance | `feature/ui-hci-route-recovery-finance` / `C:\Users\User\dev\FYP-ui-hci-finance` | Fixed finance applications grid overflow; captured after screenshots for dashboard and finance routes. | `5c43d2d fix(ui): prevent finance applications route overflow`; `833367e docs(ux): record dashboard finance route health evidence` | Route-health E2E passed, including finance interaction checks. |
| Agent D - Graph + Operations | `feature/ui-hci-route-recovery-graph-ops` / `C:\Users\User\dev\FYP-ui-hci-graph-ops` | Verified graph and operations routes; captured after screenshots. | `74e3ddb docs(ux): record graph operations route health evidence` | Graph/operations route-specific E2E passed. |
| Agent E - HCI Docs + Instrumentation | `feature/ui-hci-evaluation-docs` / `C:\Users\User\dev\FYP-ui-hci-docs` | Added HCI assessment docs, cognitive walkthrough, heuristic worksheet, metrics placeholder, Playwright HCI instrumentation, and screenshot capture. | `d77d203`, `efc561b`, `8e9e258`, `dc0621f`, `88cecc9` | HCI walkthrough and screenshot specs passed. |

## Route Health Before / After

| Route | Before result | After result | Evidence |
| --- | --- | --- | --- |
| `/dashboard` | Healthy; no before-error screenshot generated. | Healthy. | `docs/evidence/ux/screenshots/after-dashboard.png` |
| `/finance/opportunities` | Healthy; no before-error screenshot generated. | Healthy. | `docs/evidence/ux/screenshots/after-finance-opportunities.png` |
| `/finance/applications` | Healthy under broad route check; overflow found in interaction check. | Healthy after CSS grid fix. | `docs/evidence/ux/screenshots/after-finance-applications.png` |
| `/finance/contracts` | Healthy; no before-error screenshot generated. | Healthy. | `docs/evidence/ux/screenshots/after-finance-contracts.png` |
| `/graph/projects` | Healthy; no before-error screenshot generated. | Healthy. | `docs/evidence/ux/screenshots/after-graph-projects.png` |
| `/operations` | Healthy; no before-error screenshot generated. | Healthy. | `docs/evidence/ux/screenshots/after-operations.png` |

## HCI Metrics

| Metric | Source | Current status |
| --- | --- | --- |
| Task Completion Rate | Playwright instrumentation only. | Scripted route walkthrough measured successfully; not a participant metric. |
| Error Frequency Rate | Playwright page/console instrumentation only. | Scripted run recorded zero observed errors; not a human-study metric. |
| Time-on-Task | Playwright elapsed milliseconds. | Recorded in `docs/evidence/ux/hci-walkthrough-instrumentation.json`; automation timing only. |
| SUS | Participant survey. | Not measured - participant survey required. |

## Tests Run During Aggregation

- `corepack pnpm --dir apps/api test:unit -- graph` - passed.
- `corepack pnpm --dir apps/api test:integration -- graph` - passed.
- `corepack pnpm lint` - passed during agent validation and final aggregation.
- `corepack pnpm typecheck` - passed during agent validation and final aggregation.
- `corepack pnpm test:unit` - passed during agent validation and final aggregation.
- `corepack pnpm test:integration` - passed during agent validation and final aggregation.
- `corepack pnpm build` - passed during agent validation and final aggregation.
- `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` - passed after merge.
- `corepack pnpm test:e2e -- tests/e2e/20-hci-walkthrough.spec.ts` - passed after merge.
- `corepack pnpm test:e2e -- tests/e2e/21-hci-screenshot-capture.spec.ts` - passed after merge.

Full validation after final aggregation:

- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test:unit` - passed.
- `corepack pnpm test:integration` - passed.
- `corepack pnpm test:e2e` - passed, 45 passed and 1 intentionally skipped real-Gateway UAT proof spec.
- `corepack pnpm test:a11y` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm test:ci` - passed.
- `corepack pnpm verify` - passed.

## Merge And Conflict Notes

- `tests/e2e/00-route-health.spec.ts` conflicted between Agent B and Agent C. Resolution kept Agent B's broad six-route smoke diagnostics and added Agent C's finance interaction regression.
- `docs/evidence/ux/UI_ROUTE_HEALTH_AUDIT.md` conflicted across Agents B, C, and D. Resolution preserved the baseline results, finance overflow finding, graph/operations findings, and all after-screenshot links.
- Agent E screenshots initially used generic names. The screenshot spec was extended to also emit the requested HCI screenshot filenames.
- The first full `corepack pnpm test:e2e` aggregation run failed because the Guided Demo toggle intercepted two existing workflow clicks. The demo guide was moved from the bottom-right action area to the upper-right rail on desktop, then the failed evidence/audit and closure specs passed and the full E2E suite passed.

## Blockers

- No route-health blocker remains.
- In-app Browser was unavailable for Agent C (`Browser is not available: iab`); Playwright was used instead.
- SUS and participant-based usability scoring remain blocked until real participant survey data exists.
- Graph annotation UI and E2E are not included in this UI/HCI recovery workstream; the backend API is complete and should be consumed by a later UI slice.

## Remaining Hardening

- Real OIDC provider UAT.
- PDF/spreadsheet report exports.
- MinIO/object storage backup automation.
- Manual screen-reader/mobile accessibility review.
- External ERP/e-signature/payment/finance provider integrations.
- Loss exception policy thresholds, appeal/reopen governance, and exception analytics.
- Graph annotation UI, persisted drag/drop positions, team-curated default views, and time-based risk ageing.

## Final Validation Status

Final full validation passed. Results are recorded in `docs/testing/final-validation-matrix.md`.
