# UI/HCI Screenshot Index

Date: 2026-06-06

## Route Health Screenshots

| Screenshot | Route | Purpose | Status |
| --- | --- | --- | --- |
| `docs/evidence/ux/screenshots/before-dashboard-error.png` | `/dashboard` | Baseline error capture if route fails. | Not generated; route passed baseline health check. |
| `docs/evidence/ux/screenshots/before-finance-opportunities-error.png` | `/finance/opportunities` | Baseline error capture if route fails. | Not generated; route passed baseline health check. |
| `docs/evidence/ux/screenshots/before-finance-applications-error.png` | `/finance/applications` | Baseline error capture if route fails. | Not generated; route passed baseline health check. |
| `docs/evidence/ux/screenshots/before-finance-contracts-error.png` | `/finance/contracts` | Baseline error capture if route fails. | Not generated; route passed baseline health check. |
| `docs/evidence/ux/screenshots/before-graph-projects-error.png` | `/graph/projects` | Baseline error capture if route fails. | Not generated; route passed baseline health check. |
| `docs/evidence/ux/screenshots/before-operations-error.png` | `/operations` | Baseline error capture if route fails. | Not generated; route passed baseline health check. |
| `docs/evidence/ux/screenshots/after-dashboard.png` | `/dashboard` | After evidence for dashboard route health. | Captured. |
| `docs/evidence/ux/screenshots/after-finance-opportunities.png` | `/finance/opportunities` | After evidence for finance opportunities route health. | Captured. |
| `docs/evidence/ux/screenshots/after-finance-applications.png` | `/finance/applications` | After evidence for finance applications route health and overflow fix. | Captured. |
| `docs/evidence/ux/screenshots/after-finance-contracts.png` | `/finance/contracts` | After evidence for finance contracts route health. | Captured. |
| `docs/evidence/ux/screenshots/after-graph-projects.png` | `/graph/projects` | After evidence for graph route health and no-leak route coverage. | Captured. |
| `docs/evidence/ux/screenshots/after-operations.png` | `/operations` | After evidence for operations route health. | Captured. |

## Cognitive Walkthrough Screenshots

| Screenshot | Route | Purpose |
| --- | --- | --- |
| `docs/evidence/ux/screenshots/cw-01-dashboard.png` | `/dashboard` | Start of scripted HCI walkthrough. |
| `docs/evidence/ux/screenshots/cw-02-procurement-hub.png` | `/procurement` | Procurement hub task context. |
| `docs/evidence/ux/screenshots/cw-03-finance-opportunities.png` | `/finance/opportunities` | Finance opportunity review context. |
| `docs/evidence/ux/screenshots/cw-04-evidence-packs.png` | `/evidence/packs` | Evidence review context. |
| `docs/evidence/ux/screenshots/cw-05-audit.png` | `/audit` | Audit visibility context. |
| `docs/evidence/ux/screenshots/cw-06-hash-verification.png` | `/evidence/hashes` | Hash/Fabric verification context. |
| `docs/evidence/ux/screenshots/cw-07-graph-projects.png` | `/graph/projects` | Graph/canvas context. |

## HCI Heuristic Screenshots

| Screenshot | Route | Heuristic focus |
| --- | --- | --- |
| `docs/evidence/ux/screenshots/hci-dashboard-status-visibility.png` | `/dashboard` | Visibility of system status. |
| `docs/evidence/ux/screenshots/hci-finance-approval-flow.png` | `/finance/applications` | Approval-flow clarity and state visibility. |
| `docs/evidence/ux/screenshots/hci-contract-confirmation-state.png` | `/finance/contracts` | Confirmation and reversible-state clarity. |
| `docs/evidence/ux/screenshots/hci-graph-information-density.png` | `/graph/projects` | Graph information density, filters, and visual scanability. |
| `docs/evidence/ux/screenshots/hci-operations-error-prevention.png` | `/operations` | Error prevention, operations status, and safe integration wording. |

## Representative Route Screenshots

| Screenshot | Route |
| --- | --- |
| `docs/evidence/ux/screenshots/shot-01-dashboard.png` | `/dashboard` |
| `docs/evidence/ux/screenshots/shot-02-procurement-hub.png` | `/procurement` |
| `docs/evidence/ux/screenshots/shot-03-finance-opportunities.png` | `/finance/opportunities` |
| `docs/evidence/ux/screenshots/shot-04-operations.png` | `/operations` |
| `docs/evidence/ux/screenshots/shot-05-reports.png` | `/reports` |
| `docs/evidence/ux/screenshots/shot-06-evidence-package.png` | `/evidence-package` |

## Safety Notes

- No screenshot should include PEM blocks, private keys, tokens, passwords, generated secret files, VM credentials, or Fabric material.
- The HCI screenshots are production-route evidence, not participant-study results.
- SUS remains not measured until real participant survey data exists.
