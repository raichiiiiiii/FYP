# HCI Action Plan

| Field | Value |
| --- | --- |
| Product | MEPN |
| Plan owner | TBD |
| Prepared by | Agent E - HCI Instrumentation + Evaluation Docs |
| Status | Draft remediation template. Route-health validation passed for the instrumented routes; prioritization is provisional until reviewer findings are available. |

## Current Position

The HCI evidence pack is prepared for evaluation, and the current Agent E Playwright route-health checks passed. Final human HCI scoring is still blocked until walkthrough reviewers and any participant-study evidence are collected. This action plan should be updated after each walkthrough, heuristic review, accessibility test, or participant session.

## Remediation Backlog

| ID | Source | Issue summary | Route/surface | Severity | Recommended action | Verification method | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HCI-ACT-001 | Route health | Confirm HCI walkthrough routes render with seeded test data before scoring | `/dashboard`, `/procurement`, `/finance/opportunities`, `/evidence/packs`, `/audit`, `/evidence/hashes`, `/graph/projects`, `/operations`, `/reports`, `/evidence-package` | High | Run HCI Playwright specs and capture safe screenshots | `corepack pnpm test:e2e -- tests/e2e/20-hci-walkthrough.spec.ts` and `21-hci-screenshot-capture.spec.ts` | QA/HCI | Completed for current validation run |
| HCI-ACT-002 | Metrics governance | Prevent accidental publication of unmeasured SUS or participant metrics | `docs/evidence/ux/hci-metrics.json` | High | Keep metric statuses explicit and require participant survey source for SUS | Documentation review | QA/HCI | Open |
| HCI-ACT-003 | Cognitive walkthrough | Populate observations and finding IDs after reviewer walkthrough | HCI worksheet routes | Medium | Complete reviewer observations with evidence links | Reviewer sign-off | HCI reviewer | Open |
| HCI-ACT-004 | Heuristic evaluation | Convert heuristic findings into route-specific remediation tasks | HCI heuristic routes | Medium | Assign owner, severity, and verification path for each finding | Issue/PR review | Product/Engineering | Open |
| HCI-ACT-005 | Screenshot evidence | Keep UX screenshots sanitized and current | `docs/evidence/ux/screenshots/` | Medium | Regenerate screenshots after route or layout changes | Playwright screenshot spec | QA/HCI | Open |

## Prioritization Rules

1. Resolve route-health blockers before calculating task completion, error frequency, or time-on-task.
2. Resolve misleading success states before cosmetic issues.
3. Prioritize role/permission clarity, error recovery, and evidence/audit trust signals for regulated workflows.
4. Use the UI contract and production code over Figma mock behavior when conflicts appear.

## Verification Checklist

| Check | Required evidence | Status |
| --- | --- | --- |
| Lint | `corepack pnpm lint` | Passed |
| Typecheck | `corepack pnpm typecheck` | Passed |
| Unit tests | `corepack pnpm test:unit` | Passed |
| HCI walkthrough spec | `corepack pnpm test:e2e -- tests/e2e/20-hci-walkthrough.spec.ts` | Passed |
| HCI screenshot spec | `corepack pnpm test:e2e -- tests/e2e/21-hci-screenshot-capture.spec.ts` | Passed |
| Build | `corepack pnpm build` | Passed |

## Next Review

After route health is green:

- Fill in `HCI_COGNITIVE_WALKTHROUGH.md` observations.
- Fill in `HCI_HEURISTIC_EVALUATION.md` findings.
- Update `hci-metrics.json` with measured Playwright-only values where appropriate.
- Add participant survey protocol and SUS results only after real participant data is collected.
