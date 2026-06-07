# HCI Cognitive Walkthrough

| Field | Value |
| --- | --- |
| Product | MEPN |
| Evaluation type | Cognitive walkthrough template with Playwright instrumentation map |
| Status | Prepared. Playwright route probes ran on 2026-06-07. No human walkthrough score, SUS score, or participant result is recorded here. |

## Walkthrough Goal

Assess whether representative MEPN users can understand:

- Where they are in the procurement-to-finance workflow.
- What action is available next.
- Why a route or action is allowed, blocked, pending, failed, or unavailable.
- How procurement evidence supports restricted mudarabah review.
- Whether contract, disbursement, ledger, closure, audit, and Fabric states are truthful and recoverable.

## Closest Implemented Workflow Mapping

The closest implemented workflow for this HCI pass is the finance review chain anchored by procurement evidence:

```text
Procurement evidence
-> Finance opportunity
-> Mudarabah application
-> Due diligence / Shariah review
-> Contract readiness
-> Disbursement state
-> Ledger and profit/loss state
-> Closure/evidence pack
-> Audit/hash/Fabric verification status
```

Representative route mapping:

| Workflow segment | Closest route/surface | HCI focus |
| --- | --- | --- |
| System and role orientation | `/dashboard` | Visibility of system status, setup/readiness, and role-aware next actions. |
| Procurement evidence source | `/procurement`, `/procurement/projects`, `/procurement/requisitions` | Evidence provenance, loading/empty/error states, and path to source records. |
| Finance opportunity entry | `/finance/opportunities` | Whether the user can identify revenue-generating opportunity status and evidence readiness. |
| Application/reviewer workspace | `/finance/applications`, `/finance/applications/:applicationId` | Whether due diligence, Shariah review, checklist, risk, and status gates are understandable. |
| Contract readiness | `/finance/contracts` and application contract panels | Whether contract generation/signature readiness is visible without implying execution. |
| Disbursement control | Application/disbursement panels when implemented | Whether unsigned contracts or missing approvals block disbursement clearly. No successful disbursement is assumed. |
| Ledger/P&L/closure | `/finance/ledgers`, `/finance/profit-loss`, `/finance/closures`, `/evidence/packs` | Whether evidence lineage and no-guaranteed-return constraints are clear. No ledger closure is assumed. |
| Audit and proof | `/audit`, `/audit/search`, `/evidence/hashes`, `/evidence-package` | Whether hash/Fabric state is explicit and does not fake anchoring or verification. |
| Network context | `/graph/projects` | Whether graph/canvas density, permissions, risk/status overlays, and navigation support task understanding. |
| Operations health | `/operations` | Whether degraded app/API/worker/outbox/Fabric/backup status is visible and actionable. |

## Reviewer Personas

| Persona | Primary intent | Production route focus |
| --- | --- | --- |
| SME Admin | Confirm setup health, users, roles, operational readiness, and audit safety. | `/dashboard`, `/admin/users`, `/admin/roles`, `/operations` |
| Procurement Officer | Create and monitor procurement evidence for finance review. | `/procurement`, `/procurement/projects`, `/procurement/requisitions`, `/evidence/packs` |
| Financier User | Review opportunity/application evidence, contract readiness, disbursement state, and monitoring state. | `/finance/opportunities`, `/finance/applications`, `/finance/contracts` |
| Shariah Reviewer | Inspect eligibility, contract form, profit ratio, loss treatment, and allowed expenses. | `/finance/applications/:applicationId`, Shariah review panels/routes |
| Auditor | Verify evidence packs, audit events, hashes, and Fabric state labels. | `/audit`, `/audit/search`, `/evidence/hashes`, `/evidence-package` |

## Walkthrough Tasks

| ID | Persona | Task | Entry route | Success observation to record | Source label |
| --- | --- | --- | --- | --- | --- |
| CW-01 | SME Admin | Orient from dashboard to health/readiness and next role-aware task. | `/dashboard` | Record whether status, degraded states, and next actions are visible. | `Expert-estimated` or `Playwright-instrumented` |
| CW-02 | Procurement Officer | Locate procurement hub and source evidence for a finance reviewer. | `/procurement` | Record whether procurement records and evidence gaps are discoverable. | `Expert-estimated` or `Playwright-instrumented` |
| CW-03 | Financier User | Inspect finance opportunities and understand pipeline readiness. | `/finance/opportunities` | Record whether opportunity status and linked procurement evidence are clear. | `Expert-estimated` or `Playwright-instrumented` |
| CW-04 | Financier User / Shariah Reviewer | Inspect application gates for due diligence, Shariah review, and approval readiness. | `/finance/applications` or `/finance/applications/:applicationId` | Record whether gate status explains why approval is allowed or blocked. | `Expert-estimated` |
| CW-05 | Financier User | Check contract readiness without assuming contract execution. | `/finance/contracts` | Record whether signer/document/outbox status is clear and reversible where possible. | `Expert-estimated` or `Playwright-instrumented` |
| CW-06 | Financier User / Finance user | Check disbursement state and blocked preconditions. | Application/disbursement panel when available | Record whether unsigned contract, missing review, or failed integration states prevent unsafe continuation. | `Expert-estimated` |
| CW-07 | Finance/Accountant / Auditor | Inspect ledger, profit/loss, closure, and loss exception signals. | `/finance/ledgers`, `/finance/profit-loss`, `/finance/closures`, `/evidence/packs` | Record whether no guaranteed fixed return is implied and evidence lineage is visible. | `Expert-estimated` |
| CW-08 | Auditor | Verify audit/hash/Fabric status labels. | `/audit`, `/evidence/hashes`, `/evidence-package` | Record whether pending, failed, unavailable, mock, anchored, and verified states are distinguishable. | `Expert-estimated` or `Playwright-instrumented` |
| CW-09 | Cross-role reviewer | Use graph/canvas context without leaking unauthorized information. | `/graph/projects` | Record whether status/risk density supports navigation without overwhelming the user. | `Expert-estimated` or `Playwright-instrumented` |
| CW-10 | Admin / Operator | Interpret operations health and recovery actions. | `/operations` | Record whether degraded app/API/worker/outbox/Fabric/backup states are actionable. | `Expert-estimated` or `Playwright-instrumented` |

## Cognitive Walkthrough Questions

For each task, reviewers should answer:

| Question | Observation | Evidence link | Finding ID |
| --- | --- | --- | --- |
| Will the user know what goal can be accomplished on this screen? | TBD | TBD | TBD |
| Will the user notice the correct control, status label, or next step? | TBD | TBD | TBD |
| Will the user understand that the action or route is permitted for their role? | TBD | TBD | TBD |
| Will the user understand why the action is blocked, pending, failed, or unavailable? | TBD | TBD | TBD |
| Will the user receive clear feedback after navigation or action? | TBD | TBD | TBD |
| Are loading, empty, error, and permission-denied states clear and recoverable? | TBD | TBD | TBD |
| Does the screen avoid fake success for Fabric, payment, disbursement, ledger closure, and fixed returns? | TBD | TBD | TBD |
| Does the screen support both first-time understanding and experienced-user efficiency? | TBD | TBD | TBD |

## Playwright Instrumentation

`tests/e2e/20-hci-walkthrough.spec.ts` is the automation companion for this worksheet. It is intentionally conservative:

- It attempts database reset and API seeding, then skips with a clear reason if prerequisites are unavailable.
- It sets a production-shaped dev session through `setSession`.
- It navigates representative routes only after setup succeeds.
- It records route render status, elapsed time, console/page errors, and optional screenshots.
- It writes `docs/evidence/ux/hci-walkthrough-instrumentation.json` only for an actual run.
- It skips when routes are blocked, unavailable, access-denied for the seeded role, or unsafe for screenshot capture.

Automation output may be labeled `Playwright-instrumented`. It is not a participant result and must not be converted into SUS.

## Scoring Status

| Metric | Status |
| --- | --- |
| Task Completion Rate | `Playwright-instrumented: 100% for 7/7 scripted route probes` |
| Error Frequency Rate | `Playwright-instrumented: 0 observed errors` |
| Time-on-Task | `Playwright-instrumented: 6485 ms total scripted route time` |
| Cognitive friction rating | `Not measured` |
| System Usability Scale | `Not measured — participant survey required` |
