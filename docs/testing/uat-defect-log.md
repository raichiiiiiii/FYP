# MEPN UAT Defect Log

Use this log for defects found during formal UAT. Keep one row per defect and
attach screenshots or exported files where relevant.

## Severity Guide
- Critical: blocks a core UAT journey or causes data loss/security exposure.
- High: blocks an important role workflow with no acceptable workaround.
- Medium: causes confusion or incorrect behavior but has a workaround.
- Low: wording, layout, minor validation, or cosmetic issue.

## Defects
| Defect ID | Date | Role | Scenario ID | Data Source | Severity | Summary | Steps To Reproduce | Expected | Actual | Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UAT-DEF-001 | | | | API-backed seeded data / frontend fixture / mock adapter / not implemented | | | | | | | | Open |

## Resolution Notes
| Defect ID | Resolution | Retest Date | Retest Result | Reviewer |
| --- | --- | --- | --- | --- |
| UAT-DEF-001 | | | | |

## Reproducibility Notes

Attach these details to every defect when available:

- seed output JSON file name
- organization ID
- user email and role
- browser and viewport
- route path
- whether the failing state was API-backed, fixture-backed, mock-adapter-backed,
  or intentionally unavailable

## Phase 13 Automated Verification Status

No manual UAT defect has been filed from the Phase 13 closeout run.

Automated verification on `2026-06-04 08:26 +09:00` passed:

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm test:e2e`
- Docker compose config
- Docker compose build

Manual UAT has not been executed as a formal reviewer session in this report.
Use the defect table above once reviewer-led UAT begins.
