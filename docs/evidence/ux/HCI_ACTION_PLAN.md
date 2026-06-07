# HCI Action Plan

| Field | Value |
| --- | --- |
| Product | MEPN |
| Plan owner | TBD |
| Prepared for | Agent HCI Templates |
| Status | Draft remediation and verification plan. No route pass, human HCI score, SUS score, participant score, Fabric success, payment success, disbursement success, or ledger closure is claimed. |

## Current Position

The HCI evidence pack is prepared for later evaluator use. Documentation and Playwright scaffolding exist so reviewers can collect evidence consistently, but final HCI scoring remains blocked until route prerequisites are available and reviewer or participant evidence is actually collected.

SUS remains `Not measured — participant survey required`.

## Remediation Backlog

| ID | Source | Issue summary | Route/surface | Severity | Recommended action | Verification method | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HCI-ACT-001 | Route prerequisites | Confirm app, API, database, seeded data, and target routes are available before scoring. | HCI Playwright route list | High | Run HCI Playwright specs and record skips/blockers separately from findings. | `corepack pnpm test:e2e -- tests/e2e/20-hci-walkthrough.spec.ts` and `tests/e2e/21-hci-screenshot-capture.spec.ts` | QA/HCI | Prepared |
| HCI-ACT-002 | Metrics governance | Prevent accidental publication of unmeasured SUS, task completion, timing, or participant metrics. | `docs/evidence/ux/hci-metrics.json` | High | Keep exact metric source labels and unmeasured defaults until evidence exists. | Documentation review | QA/HCI | Prepared |
| HCI-ACT-003 | Cognitive walkthrough | Populate task observations and finding IDs after reviewer walkthrough. | Finance/contract/disbursement/evidence/audit route chain | Medium | Conduct expert walkthrough using `HCI_COGNITIVE_WALKTHROUGH.md`. | Reviewer sign-off with evidence links | HCI reviewer | Open |
| HCI-ACT-004 | Heuristic evaluation | Convert heuristic observations into route-specific remediation tasks. | All scoped UI routes and states | Medium | Conduct expert review using `HCI_HEURISTIC_EVALUATION.md`. | Finding table with severity and owner | Product/Engineering | Open |
| HCI-ACT-005 | Screenshot evidence | Keep screenshots sanitized and current. | `docs/evidence/ux/screenshots/` | Medium | Regenerate only from current production routes and skip unsafe pages. | Playwright screenshot spec output | QA/HCI | Open |
| HCI-ACT-006 | Error prevention and forgiveness | Verify unsafe financial, contract, disbursement, ledger, and Fabric transitions have clear blockers and recovery guidance. | Finance, evidence, audit, operations | High | Review blocked-state copy, disabled actions, confirmation dialogs, retry paths, and immutable-state explanations. | Expert review plus targeted route/component tests | Product/Engineering | Open |
| HCI-ACT-007 | Flexibility and efficiency | Verify experienced users can move between dashboard, graph, procurement, finance, evidence, audit, operations, and reports without losing context. | Navigation and route shells | Medium | Review cross-links, tabs, filters, breadcrumbs, and task inbox links. | Expert review and Playwright navigation probe | Product/Engineering | Open |
| HCI-ACT-008 | Aesthetic/minimalist design | Verify screens remain operationally dense but readable and do not bury status or evidence under decorative content. | Dashboard, graph, finance, evidence, operations | Medium | Review information hierarchy, table/card density, headings, and action priority. | Expert review screenshots | Product/Design | Open |

## Prioritization Rules

1. Resolve setup and route blockers before calculating task completion, error frequency, or time-on-task.
2. Resolve misleading success states before cosmetic issues.
3. Prioritize role/permission clarity, error recovery, and evidence/audit trust signals for regulated workflows.
4. Use the SRS, SDD, UI contract, and production code over Figma mock behavior when conflicts appear.
5. Keep participant metrics separate from expert estimates and Playwright instrumentation.

## Verification Checklist

| Check | Command or evidence | Status recording rule |
| --- | --- | --- |
| Lint | `corepack pnpm lint` | Record actual result after run. |
| Typecheck | `corepack pnpm typecheck` | Record actual result after run. |
| Unit tests | `corepack pnpm test:unit` | Record actual result after run. |
| HCI walkthrough syntax/run | `corepack pnpm test:e2e -- tests/e2e/20-hci-walkthrough.spec.ts` | Passing means only the scripted run completed; skipped routes remain blockers. |
| HCI screenshot syntax/run | `corepack pnpm test:e2e -- tests/e2e/21-hci-screenshot-capture.spec.ts` | Passing means only safe screenshot capture completed for available routes. |
| Build | `corepack pnpm build` | Record actual result after run. |
| Human cognitive walkthrough | Completed worksheet with reviewer name/date | Required before human HCI scoring. |
| Human heuristic evaluation | Completed finding table with severity and evidence links | Required before expert HCI conclusions. |
| SUS | Participant survey responses | Must remain `Not measured — participant survey required` without real survey data. |

## Next Review Steps

1. Run the conservative Playwright HCI specs in a prepared local environment.
2. Record skips and blockers without treating them as route failures or route passes.
3. Complete cognitive walkthrough observations with evidence links.
4. Complete heuristic findings with severity, owner, and verification method.
5. Add participant survey protocol and SUS results only after real participant data is collected.
