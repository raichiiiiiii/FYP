# HCI Assessment Activity Report

| Field | Value |
| --- | --- |
| Product | Mudarabah-Enabled Procurement Network |
| Repository | `raichiiiiiii/FYP` |
| Worktree | `C:\Users\User\dev\FYP` |
| Branch observed | `main` |
| Prepared for | Agent HCI Templates |
| Status | Evidence templates prepared and Playwright route/screenshot instrumentation run on 2026-06-07. No SUS result, participant score, Fabric success, payment success, disbursement success, ledger closure, or profit distribution success is claimed. |

## Assessment Boundary

This report prepares HCI evaluation evidence for the MEPN production web application. It is not a usability certification and it does not replace reviewer walkthroughs, participant studies, accessibility review, security review, Shariah review, financial review, or Fabric proof validation.

The evidence pack is scoped to:

- HCI activity planning using the DECIDE model.
- Cognitive walkthrough mapping for the closest implemented procurement, finance, contract, disbursement, evidence, and audit workflow surfaces.
- Heuristic evaluation preparation for system status visibility, error prevention and forgiveness, flexibility and efficiency, aesthetic/minimalist design, role clarity, and audit trust.
- Conservative Playwright instrumentation that can capture route health, timing, screenshots, and browser errors only when the app, API, database, seeded data, and routes are available.
- Metrics governance that distinguishes automation from expert judgement and participant studies.

Out of scope for this task:

- Fabric topology readiness or graph API changes.
- Human usability or task-success claims from route rendering alone.
- Fabric anchoring success unless proven by backend/Gateway evidence.
- Payment, disbursement, ledger closure, or mudarabah profit distribution success.
- Any SUS score or participant score.

## Source Of Truth

The assessment follows the repository authority order:

1. `docs/requirements/mudarabah_eprocurement_srs.tex`
2. `docs/design/mepn_software_design_description.tex`
3. `docs/ui/mepn-ui-contract-flow.md`
4. `docs/ui/mepn-ui-contract-flow-appendix.md`
5. `docs/ui/figma-to-ui-contract-map.md`
6. `docs/design/figma-make-reference/`
7. Existing production code

The Figma Make prototype remains a visual and interaction reference only. It is not authority for authorization, validation, workflow state transitions, API behavior, backend persistence, audit behavior, Fabric anchoring, ledger calculations, routing, or deployment behavior.

## DECIDE Model

| DECIDE step | MEPN application for this evidence pack | Output |
| --- | --- | --- |
| Determine goals | Check whether users can understand procurement-to-finance status, role permissions, evidence readiness, contract/disbursement gates, audit proof status, and recovery paths. | HCI goals and route/task list |
| Explore questions | Ask whether users know where they are, what can be done next, why a route/action is blocked, what evidence is missing, and what status is real versus pending/unavailable. | Cognitive walkthrough questions |
| Choose methods | Use expert heuristic review, cognitive walkthrough, and Playwright-instrumented route/screenshot capture. Participant SUS remains separate. | Review worksheets and E2E skeletons |
| Identify practical issues | Confirm local app/API/database availability, seeded data, role session, screenshot safety, route permissions, and no sensitive text exposure. | Skip/blocker rules |
| Decide ethical handling | Do not fabricate participant metrics, do not expose secrets in screenshots, and do not imply production financial/Fabric outcomes from UI rendering. | Evidence and metric rules |
| Evaluate and present | Record observations, blockers, severity, screenshots, and automation output only after a real run or review session. | Action plan and metrics registry |

## Relevant Requirements

| Area | Source | HCI implication |
| --- | --- | --- |
| Source-to-pay procurement | SRS in-scope procurement functions; SDD Procurement Core | Users need clear route labels, statuses, validation, and evidence links across requisition, RFQ, quotation, PO, receipt, invoice, and matching surfaces. |
| Evidence-driven mudarabah finance | SRS in-scope capital application, review, contract, disbursement, monitoring, P/L, closure; SDD ADR that procurement evidence drives finance | Finance screens must explain evidence readiness, due diligence, Shariah review, contract readiness, disbursement state, ledger/P&L status, and closure readiness without treating the application as a generic loan. |
| Role-based access | SRS/SDD identity and authorization requirements; UI role contract | Routes and actions must show permission-denied states clearly, enforce reusable permission rules, and avoid cross-role leakage. |
| Audit and Fabric trust | SRS audit/Fabric scope; SDD hash-only Fabric anchoring and real Gateway proof boundary | UI must distinguish pending, unavailable, failed, mock, anchored, and verified states; screenshots cannot imply fake Fabric success. |
| Self-hosted operations | SRS/SDD deployment and observability constraints | Dashboard and operations routes should expose degraded health, queue/outbox state, backup readiness, and setup blockers as actionable status. |
| Shariah and financial safety | SRS mudarabah definition and finance lifecycle; UI/Figma map warnings | UI must not calculate guaranteed fixed returns, bypass Shariah review, fake disbursement, or fake ledger closure. |

## Relevant UI Contract Sections

| Contract source | Relevant content for HCI |
| --- | --- |
| `docs/ui/mepn-ui-contract-flow.md` Sections 3 and 4 | End-to-end flow: procurement evidence -> financing decision -> Shariah review -> contract -> disbursement -> ledger -> profit/loss -> closure pack -> audit/Fabric verification. |
| `docs/ui/mepn-ui-contract-flow.md` Section 5 | Role model for SME Admin, Procurement Officer, Approver, Finance/Accountant, Financier User, Shariah Reviewer, Auditor, and Integrator. |
| `docs/ui/mepn-ui-contract-flow.md` Section 26 | Protected entry, dashboard, organization setup, health/readiness, and authorization behavior. |
| `docs/ui/mepn-ui-contract-flow-appendix.md` Sections 11-16 | Route inventory and use-case mapping for dashboard, procurement, finance, evidence, audit, graph, integrations, operations, and reports. |
| `docs/ui/figma-to-ui-contract-map.md` | Figma reference mapping for production components, including explicit warnings not to fake approval, disbursement, Fabric anchoring, or guaranteed return behavior. |

## Figma Reference Files

The nearest visual references are in `docs/design/figma-make-reference/prototype-src/src/app/components/`:

- `DashboardView.tsx`
- `ProcurementView.tsx`
- `OpportunitiesView.tsx`
- `ApplicationsList.tsx`
- `ApplicationWorkspace.tsx`
- `LedgerView.tsx`
- `AuditView.tsx`
- `NetworkCanvas.tsx`
- `OperationsView.tsx`
- `ReportsView.tsx`

These files can guide layout and interaction expectations, but production behavior must come from the SRS, SDD, UI contracts, and existing production code.

## Metrics Governance

Allowed metric source labels:

- `Playwright-instrumented`
- `Expert-estimated`
- `Not measured`
- `Requires user study`

| Metric | Current source label | Current value/status | Rule |
| --- | --- | --- | --- |
| Task Completion Rate | `Playwright-instrumented` | `100% for 7/7 scripted route probes` | Do not generalize automation to human success. |
| Error Frequency Rate | `Playwright-instrumented` | `0 observed errors across scripted probes` | Count only observed page, console, request, or rendered-error findings during a defined run. |
| Time-on-Task | `Playwright-instrumented` | `6485 ms total scripted route time` | Automation timing can support regression evidence only; it is not human task timing. |
| Cognitive friction rating | `Expert-estimated` | `Not measured` | Expert reviewers may record severity with evidence links; this is not participant data. |
| System Usability Scale | `Requires user study` | `Not measured — participant survey required` | Keep this exact value unless real participant survey responses exist. |

## Activity Matrix

| Activity | Method | Evidence output | Current status |
| --- | --- | --- | --- |
| Route prerequisite check | Playwright setup, seeded session, route navigation | E2E output and instrumentation JSON | Passed in local Playwright run |
| Cognitive walkthrough | Reviewer worksheet mapped to implemented route surfaces | `HCI_COGNITIVE_WALKTHROUGH.md` | Template prepared; Playwright route probes measured |
| Heuristic evaluation | Expert review against MEPN-adapted heuristics | `HCI_HEURISTIC_EVALUATION.md` | Template prepared |
| Screenshot capture | Safe Playwright screenshots with sensitive-text guard | `docs/evidence/ux/screenshots/` | Passed in local Playwright run |
| Metrics registry | JSON status and source labels | `hci-metrics.json` | Updated with Playwright-instrumented values |
| Remediation plan | Severity, owner, verification, and status tracker | `HCI_ACTION_PLAN.md` | Prepared |

## Blocking Conditions

Final HCI scoring remains blocked if any of the following apply:

- App, API, database, or seeded data setup is unavailable.
- The required route is missing, returns an error status, renders an application error, or shows a blank shell.
- The seeded role receives access denied for a task that is intended to be evaluated.
- Screenshots would expose secrets, tokens, private keys, passwords, certificates, or sensitive configuration.
- Fabric, payment, disbursement, ledger closure, or profit distribution evidence is UI-only.
- SUS or participant metrics are requested without a real participant study.

## Evidence Index

| Evidence | Path |
| --- | --- |
| Metrics registry | `docs/evidence/ux/hci-metrics.json` |
| Playwright instrumentation output | `docs/evidence/ux/hci-walkthrough-instrumentation.json` when generated by a run |
| Cognitive walkthrough worksheet | `docs/evidence/ux/HCI_COGNITIVE_WALKTHROUGH.md` |
| Heuristic evaluation worksheet | `docs/evidence/ux/HCI_HEURISTIC_EVALUATION.md` |
| Remediation action plan | `docs/evidence/ux/HCI_ACTION_PLAN.md` |
| Screenshot output directory | `docs/evidence/ux/screenshots/` |
| Agent notes | `docs/evidence/ux/agent-notes/agent-e-hci-evaluation-docs.md` |
