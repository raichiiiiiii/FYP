# UI/HCI Screenshot Index

Date: 2026-06-07

## Route Health Failure Screenshots

These screenshots are not fabricated or pre-created. The route-health spec writes them only when a route fails the baseline health criteria.

| Route | Screenshot path | Console errors | Network failures | API status | Suspected cause | Before status | After status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | `docs/evidence/ux/screenshots/route-health/dashboard-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Response below 500 | No current route-health failure | Not reproduced | Passed |
| `/finance/opportunities` | `docs/evidence/ux/screenshots/route-health/finance-opportunities-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Response below 500 | No current route-health failure | Not reproduced | Passed |
| `/finance/applications` | `docs/evidence/ux/screenshots/route-health/finance-applications-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Response below 500 | No current route-health failure | Not reproduced | Passed |
| `/finance/contracts` | `docs/evidence/ux/screenshots/route-health/finance-contracts-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Response below 500 | No current route-health failure | Not reproduced | Passed |
| `/graph/projects` | `docs/evidence/ux/screenshots/route-health/graph-projects-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Response below 500 | No current route-health failure | Not reproduced | Passed |
| `/operations` | `docs/evidence/ux/screenshots/route-health/operations-failure.png` | No failing diagnostic in latest run | No failing diagnostic in latest run | Response below 500 | No current route-health failure | Not reproduced | Passed |

## Current HCI Screenshot Evidence

The following screenshots were refreshed by `corepack pnpm test:e2e -- tests/e2e/20-hci-walkthrough.spec.ts` or `corepack pnpm test:e2e -- tests/e2e/21-hci-screenshot-capture.spec.ts` on 2026-06-07.

| Screenshot | Route | Status |
| --- | --- | --- |
| `docs/evidence/ux/screenshots/cw-01-dashboard.png` | `/dashboard` | Refreshed cognitive walkthrough artifact |
| `docs/evidence/ux/screenshots/cw-02-procurement-hub.png` | `/procurement` | Refreshed cognitive walkthrough artifact |
| `docs/evidence/ux/screenshots/cw-03-finance-opportunities.png` | `/finance/opportunities` | Refreshed cognitive walkthrough artifact |
| `docs/evidence/ux/screenshots/cw-04-evidence-packs.png` | `/evidence/packs` | Refreshed cognitive walkthrough artifact |
| `docs/evidence/ux/screenshots/cw-05-audit.png` | `/audit` | Refreshed cognitive walkthrough artifact |
| `docs/evidence/ux/screenshots/cw-06-hash-verification.png` | `/evidence/hashes` | Refreshed cognitive walkthrough artifact |
| `docs/evidence/ux/screenshots/cw-07-graph-projects.png` | `/graph/projects` | Refreshed cognitive walkthrough artifact |
| `docs/evidence/ux/screenshots/hci-dashboard-status-visibility.png` | `/dashboard` | Refreshed HCI screenshot |
| `docs/evidence/ux/screenshots/hci-finance-approval-flow.png` | `/finance/opportunities` | Refreshed HCI screenshot |
| `docs/evidence/ux/screenshots/hci-contract-confirmation-state.png` | `/finance/contracts` | Refreshed HCI screenshot |
| `docs/evidence/ux/screenshots/hci-graph-information-density.png` | `/graph/projects` | Refreshed HCI screenshot |
| `docs/evidence/ux/screenshots/hci-operations-error-prevention.png` | `/operations` | Refreshed HCI screenshot |
| `docs/evidence/ux/screenshots/shot-01-dashboard.png` | `/dashboard` | Refreshed screenshot capture artifact |
| `docs/evidence/ux/screenshots/shot-02-procurement-hub.png` | `/procurement` | Refreshed screenshot capture artifact |
| `docs/evidence/ux/screenshots/shot-03-finance-opportunities.png` | `/finance/opportunities` | Refreshed screenshot capture artifact |
| `docs/evidence/ux/screenshots/shot-04-operations.png` | `/operations` | Refreshed screenshot capture artifact |
| `docs/evidence/ux/screenshots/shot-05-reports.png` | `/reports` | Refreshed screenshot capture artifact |
| `docs/evidence/ux/screenshots/shot-06-evidence-package.png` | `/evidence-package` | Refreshed screenshot capture artifact |

## Safety Notes

- Do not include PEM blocks, private keys, tokens, passwords, generated secret files, VM credentials, or Fabric material in screenshots.
- Route-health screenshots are failure evidence, not proof that the route was repaired.
- Passing route-health runs may produce no screenshot files by design.
