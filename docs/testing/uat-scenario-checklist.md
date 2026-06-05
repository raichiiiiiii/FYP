# MEPN UAT Scenario Checklist

Use this checklist during formal UAT. Record pass, fail, blocked, or not tested
for each scenario and attach screenshots where indicated.

## Session Details
| Field | Value |
| --- | --- |
| UAT date | |
| Tester name | |
| Role tested | |
| Prototype URL | |
| Build label/commit | |
| Seed output file | |
| Organization ID used for dev login | |
| User email used for dev login | |
| Data source observed | API-backed seeded data / frontend fixture / mock adapter / not implemented |
| Fabric mode observed | mock / gateway / unavailable |
| Fabric evidence source | mock adapter / outbox pending / failed anchor / Fabric unavailable / stored metadata fixture / real Gateway transaction / not tested |

## Pre-UAT Preparation

| ID | Check | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-PREP-01 | Run `pnpm seed:uat` against the active API | Seed JSON includes TechBuild organization, role users, procurement records, evidence pack, finance application, closure, integration notification, and reviewer start URLs | | Seed JSON |
| UAT-PREP-02 | Log in with seeded admin email and organization ID | Dashboard opens with the seeded organization context | | Screenshot |
| UAT-PREP-03 | Confirm API health | Health endpoint reports API/database/Redis status | | Screenshot/log |
| UAT-PREP-04 | Confirm fixture/mock boundaries | Tester understands dashboard/graph/audit edge states may use fixtures and external integrations are mock/adapter-backed | | Notes |
| UAT-PREP-05 | Confirm Fabric runtime mode | Integrations screen shows Fabric runtime mode, Gateway configuration status, and whether the real adapter is implemented | | Screenshot |

## SME Admin
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-ADM-01 | Log in as SME admin | Dashboard opens with organization context | | Screenshot |
| UAT-ADM-02 | Review organization setup | TechBuild organization details are visible/editable where supported | | Screenshot |
| UAT-ADM-03 | Create or review users | Users list shows seeded Aisha, Ahmad, Nurul, Omar, Hassan, and Lina demo users where API data is available | | Screenshot |
| UAT-ADM-04 | Review roles | Role list shows admin, procurement, approver, financier, Shariah, auditor roles | | Screenshot |
| UAT-ADM-05 | Open integrations | Admin can request mock integration actions and inspect outbox status | | Screenshot |

## Procurement Officer
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-PRO-01 | Open procurement dashboard/list screens | Seeded SolarTech project, Mega Components supplier, requisition, RFQ, quotation, purchase order, receipt, and invoice are reachable | | Screenshot |
| UAT-PRO-02 | Inspect requisition detail | Requisition status, items, approval state, and timeline are visible | | Screenshot |
| UAT-PRO-03 | Inspect supplier detail | Supplier profile and related records are visible | | Screenshot |
| UAT-PRO-04 | Inspect purchase order detail | PO, supplier, receipt, invoice, and status are visible | | Screenshot |
| UAT-PRO-05 | Attempt restricted admin screen | Access denied is shown | | Screenshot |

## Approver
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-APR-01 | Open approval inbox | Submitted/approved requisition tasks are visible as expected | | Screenshot |
| UAT-APR-02 | Review approval rules | Approval rule behavior is understandable | | Screenshot |
| UAT-APR-03 | Confirm segregation rule | Requester cannot approve own requisition where rule applies | | Screenshot/notes |
| UAT-APR-04 | Attempt procurement write action outside role | Access denied or unavailable action is shown | | Screenshot |

## Finance/Accounting User
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-FINOPS-01 | Open finance applications | Seeded TechBuild/SolarTech application is visible | | Screenshot |
| UAT-FINOPS-02 | Review contract and disbursement | Contract status and disbursement record are visible | | Screenshot |
| UAT-FINOPS-03 | Review ledger and profit/loss | Ledger entry and generated profit/loss statement are visible | | Screenshot |
| UAT-FINOPS-04 | Review closure pack | Closure pack is visible and linked to evidence | | Screenshot |

## Financier Reviewer
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-FIN-01 | Open application workspace | Overview, evidence, due diligence, contract, ledger, profit/loss, closure, and audit tabs are visible by permission | | Screenshot |
| UAT-FIN-02 | Review evidence checklist | Checklist status and linked evidence are understandable | | Screenshot |
| UAT-FIN-03 | Review due diligence decision | Due diligence result is stored and visible | | Screenshot |
| UAT-FIN-04 | Confirm contract gate | Contract cannot be created before required approvals | | Screenshot/notes |

## Shariah Reviewer
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-SHA-01 | Open Shariah review tab | Shariah review screen is visible | | Screenshot |
| UAT-SHA-02 | Review eligibility and profit ratio | Profit ratio and loss treatment are understandable | | Screenshot |
| UAT-SHA-03 | Confirm role gating | Due diligence-only actions are hidden or denied | | Screenshot |

## Auditor
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-AUD-01 | Open evidence packs | Evidence pack list/detail are visible in read-only mode | | Screenshot |
| UAT-AUD-02 | Download/review evidence export | Exported evidence pack can be inspected | | File/screenshot |
| UAT-AUD-03 | Use audit search | Audit events can be filtered by actor, entity, event type, and date | | Screenshot |
| UAT-AUD-04 | Verify hash record | Hash verification result is understandable | | Screenshot |
| UAT-AUD-05 | Review closure pack | Closure pack is visible and linked to audit/evidence | | Screenshot |
| UAT-AUD-06 | Open integrations | Auditor can inspect outbox/reconciliation but cannot request actions; mock adapter status is labelled honestly | | Screenshot |
| UAT-AUD-07 | Confirm Fabric evidence boundary | Auditor can distinguish mock adapter, pending outbox, failed anchor, unavailable Fabric, anchored-not-fully-verified stored metadata, stored-metadata verified state, and real Gateway evidence where available | | Screenshot/notes |

## Reports And Operations Review
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-OPS-01 | Open operations health | Health/deployment/worker caveats are understandable and unavailable states are not hidden | | Screenshot |
| UAT-OPS-02 | Open integrations | ERP, Fabric, webhook, e-signature, finance API, and outbox states show healthy/degraded/unavailable/mock labels as applicable | | Screenshot |
| UAT-OPS-03 | Inspect Fabric runtime card | Fabric runtime mode card shows mock or gateway mode without leaking endpoint or certificate/key paths | | Screenshot |
| UAT-REP-01 | Open reports | Report cards summarize current records without claiming dedicated export support | | Screenshot |
| UAT-REP-02 | Inspect export CTAs | Export actions are disabled or labelled unavailable until backend export endpoints exist | | Screenshot |

## Overall Result
| Field | Value |
| --- | --- |
| Passed scenarios | |
| Failed scenarios | |
| Blocked scenarios | |
| Critical defects | |
| UAT decision | |

## Fixture And Mock Notes

Record any screen where the visible data is not directly created by
`pnpm seed:uat`. Typical examples:

- dashboard KPI/task values, if backend summary DTOs are not yet implemented
- graph example fixture states used in tests or fallback demos
- audit verification edge states used to demonstrate pending/failed/unavailable
  anchor behavior
- stored Fabric metadata fixture states used to demonstrate reviewer wording when
  direct chaincode query is unavailable
- mock Fabric, ERP, e-signature, finance API, and webhook adapter states
- disabled report exports
