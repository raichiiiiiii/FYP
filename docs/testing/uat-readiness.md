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
| Fabric runtime boundary is visible | Integrations screen screenshot showing mock or gateway mode, adapter implementation status, and missing config if any | Ready for review |

## UAT Environment
- Environment: prototype/staging
- Build label: `MEPN skeletal workflow prototype`
- API base URL: record before session
- Web URL: record before session
- Database: seeded UAT data only
- External integrations: mock adapters through outbox only
- Fabric mode: record `mock` or `gateway` from the Integrations screen before
  each session

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

The seeded scenario is:

| Field | Value |
| --- | --- |
| SME organization | TechBuild Energy Sdn Bhd |
| Buyer/customer | SolarTech Industries Sdn Bhd |
| Primary supplier | Mega Components Sdn Bhd |
| Financier | Amanah Islamic Bank |
| Project | SolarTech Rooftop Solar Retrofit |
| Buyer reference | `BC-2026-089` |

For local/dev login, use the email from the relevant `adminUser` or `roleUsers`
entry and the printed `organization.id`. The current login screen asks for an
email and organization ID; it does not authenticate through production OIDC yet.

## Data Source Boundaries

Use these labels during UAT evidence capture:

| Label | Meaning | Examples |
| --- | --- | --- |
| API-backed seeded data | Created through `pnpm seed:uat` against the running API and PostgreSQL database | Organization, users, memberships, procurement records, evidence pack, finance application, contract, disbursement, ledger, P/L, closure, integration notification |
| Frontend fixture/demo data | Typed local fixtures used for tests or illustrative UI states where backend summary DTOs are incomplete | Dashboard KPIs, graph example fixture, audit verification edge states |
| Mock adapter state | External provider behavior routed through mock adapters/outbox | Fabric, ERP, e-signature, finance API/webhook notification |
| Stored Fabric metadata fixture | Seeded reviewer state used only to demonstrate hash-detail wording for non-mock anchor metadata | E2E/UAT demonstration of `ANCHORED_NOT_FULLY_VERIFIED` or `VERIFIED` stored metadata where direct chaincode query is unavailable |
| Real Gateway evidence | Fabric Gateway transaction and chaincode evidence produced by the backend/worker after real Gateway mode processes a hash anchor | Not proven until chaincode, identity material, Gateway environment variables, and the local Fabric test network are available |
| Not implemented | Capability intentionally unavailable or disabled | Report exports, production OIDC, saved graph layouts |

Do not mark a scenario as production-ready solely because a fixture or mock
adapter produced a useful visual state.

For hash verification review, use:

```text
docs/evidence/canonical-hash-verification.md
```

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
- Fabric mode screenshot and evidence source label

Use the evidence package template:

```text
docs/testing/uat-evidence-package-template.md
```

## Mock Vs Gateway Tester Instructions

Before testing any evidence, audit, integration, graph, or closure scenario:

1. Open the Integrations screen.
2. Record the Fabric runtime mode.
3. If mode is `mock`, treat anchor evidence as adapter-only evidence.
4. If mode is `gateway`, confirm the real adapter is implemented and Gateway
   configuration is present before treating any anchor as external evidence.
5. If an outbox event is pending, retrying, failed, or unavailable, record the
   scenario as blocked or partial rather than verified.
6. If the hash-detail screen says direct chaincode query is unavailable, record
   stored metadata as anchored or reviewer-visible only, not full on-chain proof.
7. Do not treat mock transaction IDs, mock reconciliation records, or fixture
   graph states as real Fabric proof.

## Exit Criteria
UAT can be marked complete when:

- All P0 scenarios pass or have accepted workarounds.
- No unresolved critical defect blocks the core procurement-to-finance flow.
- Evidence pack export, audit filtering, and closure pack review are demonstrated.
- Role-specific screens are accepted by the relevant reviewer groups.
- Supervisor review notes are recorded.
