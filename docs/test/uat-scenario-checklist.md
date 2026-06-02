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

## SME Admin
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-ADM-01 | Log in as SME admin | Dashboard opens with organization context | | Screenshot |
| UAT-ADM-02 | Review organization setup | Organization details are visible/editable where supported | | Screenshot |
| UAT-ADM-03 | Create or review users | Users list shows seeded role users | | Screenshot |
| UAT-ADM-04 | Review roles | Role list shows admin, procurement, approver, financier, Shariah, auditor roles | | Screenshot |
| UAT-ADM-05 | Open integrations | Admin can request mock integration actions and inspect outbox status | | Screenshot |

## Procurement Officer
| ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| UAT-PRO-01 | Open procurement dashboard/list screens | Projects, suppliers, requisitions, RFQs, quotations, purchase orders, receipts, and invoices are reachable | | Screenshot |
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
| UAT-FINOPS-01 | Open finance applications | Seeded application is visible | | Screenshot |
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
| UAT-AUD-06 | Open integrations | Auditor can inspect outbox/reconciliation but cannot request actions | | Screenshot |

## Overall Result
| Field | Value |
| --- | --- |
| Passed scenarios | |
| Failed scenarios | |
| Blocked scenarios | |
| Critical defects | |
| UAT decision | |
