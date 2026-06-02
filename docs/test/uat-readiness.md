# MEPN UAT Readiness Plan

## Purpose
This document defines when formal user acceptance testing can begin for the MEPN
MVP prototype. UAT should validate role usability and workflow credibility, not
only that the application is technically running.

## UAT Entry Gate
Formal UAT can start when each item below is confirmed for the deployed
prototype/staging build.

| Gate | Required Evidence | Status |
| --- | --- | --- |
| Role-specific navigation exists | Screenshots for admin, procurement officer, approver, financier, Shariah reviewer, and auditor navigation | Ready for review |
| Auth/session flow exists | Dev login or configured auth session can load role claims and organization context | Ready for review |
| Core forms have validation | Required-field and invalid-input screenshots from procurement, evidence, and finance screens | Ready for review |
| Procurement detail pages exist | Requisition, supplier, RFQ, purchase order, approval, matching, and timeline screens are reachable | Ready for review |
| Evidence pack export is downloadable | Exported evidence pack file attached to UAT evidence folder | Ready for review |
| Audit filtering exists | Audit search screenshot filtered by event type/entity/date | Ready for review |
| Finance review screens are role-specific | Due diligence, Shariah review, contract, ledger, profit/loss, closure, and audit tabs checked by role | Ready for review |
| Closure pack contains reviewable evidence | Closure pack screenshot and linked evidence pack export captured | Ready for review |
| Deployment is stable | Prototype/staging URL, build identifier, and smoke-test result recorded | Pending deployment confirmation |
| Demo data seeding is repeatable | `pnpm seed:uat` output attached with organization/user IDs | Ready for review |

## UAT Environment
- Environment: prototype/staging
- Build label: `MEPN skeletal workflow prototype`
- API base URL: record before session
- Web URL: record before session
- Database: seeded UAT data only
- External integrations: mock adapters through outbox only

## Repeatable Demo Data
Run the seed command after the API is running:

```bash
pnpm seed:uat
```

Optional API override:

```bash
UAT_API_BASE_URL=http://localhost:3000/api/v1 pnpm seed:uat
```

The command prints organization, user, procurement, evidence, finance, closure,
and integration IDs. Save the JSON output with the UAT evidence for traceability.

## UAT Groups
- SME admin
- Procurement officer
- Approver
- Finance/accounting user
- Financier reviewer
- Shariah reviewer
- Auditor

Current prototype note: finance/accounting and financier reviewer are both mapped
to the `FINANCIER_USER` role until a separate finance operations role is added.

## Evidence To Capture
- Scenario checklist with pass/fail status
- Screenshots for each important UI state
- Defect list with severity and owner
- User feedback notes
- Supervisor review notes
- Seed output JSON
- Prototype URL and build identifier

## Exit Criteria
UAT can be marked complete when:

- All P0 scenarios pass or have accepted workarounds.
- No unresolved critical defect blocks the core procurement-to-finance flow.
- Evidence pack export, audit filtering, and closure pack review are demonstrated.
- Role-specific screens are accepted by the relevant reviewer groups.
- Supervisor review notes are recorded.
