# HCI Cognitive Walkthrough

| Field | Value |
| --- | --- |
| Product | MEPN |
| Evaluation type | Cognitive walkthrough template and Playwright instrumentation map |
| Status | Prepared. Playwright route instrumentation passed for the scripted routes; final human walkthrough scoring remains unmeasured. |

## Walkthrough Goal

Assess whether representative MEPN users can understand where they are, what action is available, why a step is allowed or blocked, and how procurement evidence supports restricted mudarabah review without misleading success states.

## Reviewer Personas

| Persona | Primary intent | Production route focus |
| --- | --- | --- |
| SME Admin | Confirm setup health, users, roles, and operational readiness | `/dashboard`, `/admin/users`, `/admin/roles`, `/operations` |
| Procurement Officer | Create and monitor procurement evidence | `/procurement`, `/procurement/projects`, `/procurement/requisitions`, `/evidence/packs` |
| Financier User | Review opportunity/application evidence and monitoring state | `/finance/opportunities`, `/finance/applications`, `/finance/applications/:applicationId` |
| Shariah Reviewer | Inspect eligibility, contract form, profit ratio, loss treatment, and allowed expenses | `/finance/applications/:applicationId/shariah-review` |
| Auditor | Verify evidence packs, audit events, hashes, and Fabric status | `/audit`, `/audit/search`, `/evidence/hashes`, `/evidence-package` |

## Source Mapping

| Workflow question | Source section |
| --- | --- |
| What route should the user use? | `docs/ui/mepn-ui-contract-flow.md` Sections 4 and 5 |
| Which role should see the route? | `docs/ui/mepn-ui-contract-flow.md` role and route visibility contracts |
| Which routes exist or are planned? | `docs/ui/mepn-ui-contract-flow-appendix.md` route inventory |
| Which visual reference is relevant? | `docs/ui/figma-to-ui-contract-map.md` and `docs/design/figma-make-reference/` |
| Which workflow state is authoritative? | SRS and SDD before Figma prototype behavior |

## Walkthrough Tasks

| ID | Persona | Task | Entry route | Expected observable evidence | Metric eligibility |
| --- | --- | --- | --- | --- | --- |
| CW-01 | SME Admin | Orient from the dashboard to operational health and role-aware navigation | `/dashboard` | Main content renders, role/session context is visible, no access-denied state | Playwright timing eligible when route health is green |
| CW-02 | Procurement Officer | Locate procurement hub readiness and linked procurement records | `/procurement` | Procurement hub headings and backend summary content render | Playwright timing eligible when route health is green |
| CW-03 | Procurement Officer | Locate evidence package or evidence gaps for reviewer handoff | `/evidence/packs` | Evidence pack route renders with main content and no fake Fabric success | Playwright timing eligible when route health is green |
| CW-04 | Financier User | Inspect finance opportunities or application queue | `/finance/opportunities` | Pipeline/application summary renders without allowing source-record edits | Playwright timing eligible when route health is green |
| CW-05 | Auditor | Verify audit/evidence route affordances | `/audit` and `/evidence/hashes` | Audit/hash content renders; Fabric status is explicit, not fabricated | Playwright timing eligible when route health is green |
| CW-06 | Cross-role reviewer | Confirm graph/canvas route communicates network status and visibility limits | `/graph/projects` | Graph/canvas main content renders for seeded role | Playwright timing eligible when route health is green |
| CW-07 | Reviewer | Confirm evidence package browser exposes sanitized review evidence | `/evidence-package` | Sensitive strings are absent; review evidence cards render | Playwright timing eligible when route health is green |

## Walkthrough Questions

For each task, reviewers should answer:

| Question | Observation | Evidence link | Finding ID |
| --- | --- | --- | --- |
| Will the user know what goal can be accomplished on this screen? | TBD | TBD | TBD |
| Will the user notice the correct control or next step? | TBD | TBD | TBD |
| Will the user understand that the control or route is permitted for their role? | TBD | TBD | TBD |
| Will the user receive clear feedback after navigation or action? | TBD | TBD | TBD |
| Are loading, empty, error, and permission-denied states clear and recoverable? | TBD | TBD | TBD |
| Does the screen avoid fake success for Fabric, payments, disbursement, ledger closure, or fixed returns? | TBD | TBD | TBD |

## Playwright Instrumentation

`tests/e2e/20-hci-walkthrough.spec.ts` is the automation companion for this worksheet. It should:

- Seed real E2E data through API helpers.
- Set a production-shaped dev session through `setSession`.
- Navigate representative routes from this worksheet.
- Capture route render status, console/page errors, and elapsed time for scripted route tasks.
- Save screenshots under `docs/evidence/ux/screenshots/` only after routes render safely.
- Skip metric capture when route health is unresolved.

## Scoring Status

No task completion rate, error frequency rate, or time-on-task score is finalized in this worksheet. Playwright generated route instrumentation for regression evidence only. SUS is not measured here and requires participant survey responses.
