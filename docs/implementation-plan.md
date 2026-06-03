# MEPN Implementation Plan

## Execution model

Every implementation slice follows this loop:

1. Read source-of-truth documents.
2. Inspect current implementation.
3. Inspect relevant Figma reference.
4. Produce gap analysis.
5. Produce implementation plan.
6. Edit the smallest safe set of files.
7. Add or update tests.
8. Run verification commands.
9. Update documentation if behavior changes.
10. Stop and report changes.

## Slice 0: Documentation baseline

Goal:
Prepare the repository so agents and reviewers understand the relationship between SRS, SDD, UI contract, Figma prototype, and deployment documentation.

Tasks:
- Add SRS.
- Add SDD.
- Add UI Flow Contract.
- Add UI Flow Contract Appendix.
- Add Figma Make reference bundle.
- Add Figma-to-contract mapping.
- Add root `AGENTS.md`.
- Add deployment documentation stub.

Acceptance criteria:
- Codex can identify source-of-truth order.
- Figma Make files are not imported into production `src/`.
- Documentation explains that Figma is a reference, not business authority.

## Slice 1: Global shell, routing, and RBAC

Goal:
Implement production app shell and route structure.

Tasks:
- Define route registry.
- Define role/permission metadata.
- Implement sidebar from route registry.
- Implement protected route wrapper.
- Implement permission-denied state.
- Add shell layout tests.

Acceptance criteria:
- Navigation follows UI contract.
- Role visibility is enforced.
- Direct URL access is protected.
- Tests cover admin, procurement, financier, Shariah reviewer, and auditor navigation differences.

## Slice 2: Dashboard and smart task inbox

Goal:
Implement role-aware dashboard.

Tasks:
- Add dashboard DTO/types.
- Add task inbox component.
- Add KPI cards.
- Add audit/outbox/Fabric pending indicator.
- Add loading, empty, and error states.

Acceptance criteria:
- Dashboard changes by role.
- No fake successful Fabric state.
- Tests cover role-specific dashboard content.

## Slice 3: Mudarabah applications list

Goal:
Implement applications pipeline.

Tasks:
- Add application status enum.
- Add list filters.
- Add status badges.
- Add application summary cards/table.
- Add open workspace action.

Acceptance criteria:
- Status model follows UI contract.
- Filters work.
- Empty state exists.
- Tests cover filter behavior and navigation.

## Slice 4: Application workspace

Goal:
Implement the main financing workspace.

Tasks:
- Overview tab.
- Evidence tab.
- Due diligence tab.
- Shariah review tab.
- Contract tab.
- Disbursement tab.
- Monitoring tab.
- Closure tab.
- Reviewer decision model.
- Audit event display.

Acceptance criteria:
- Application cannot progress when required evidence is incomplete unless authorized waiver exists.
- Shariah and financier decisions are separate.
- Tests cover allowed and blocked transitions.

## Slice 5: Opportunities

Goal:
Implement opportunity creation from revenue-generating procurement evidence.

Tasks:
- Create opportunity form.
- Validate buyer PO, contract, sales order, or equivalent revenue source.
- Block non-revenue-generating internal consumption opportunities.
- Link opportunity to application.

Acceptance criteria:
- Eligibility validation is enforced.
- Tests cover valid and invalid opportunity creation.

## Slice 6: Procurement workflow

Goal:
Implement source-to-contract and procure-to-pay screens.

Tasks:
- Requisition.
- Approval.
- RFQ/RFP/tender.
- Quotation comparison.
- Purchase order.
- Receipt/service confirmation.
- Supplier invoice.
- Three-way match.

Acceptance criteria:
- Workflow state transitions match UI contract.
- Matching exceptions are visible.
- Tests cover happy path and mismatch path.

## Slice 7: Ledger, profit/loss, and closure

Goal:
Implement project ledger and mudarabah profit/loss workspace.

Tasks:
- Project ledger table.
- Revenue/cost evidence linkage.
- Preliminary P/L calculation.
- Profit distribution.
- Loss exception workflow.

Acceptance criteria:
- No guaranteed fixed return is calculated.
- Profit distribution follows approved ratio.
- Loss cases route to exception workflow.
- Tests cover profit, genuine loss, and breach/negligence exception paths.

## Slice 8: Audit and Fabric verification

Goal:
Implement audit timeline and anchor verification.

Tasks:
- Audit timeline.
- Document hash verification.
- Fabric transaction reference status.
- Pending anchor queue status.
- Failed anchor retry indicator.

Acceptance criteria:
- Users can distinguish pending, verified, failed, and unavailable states.
- Tests cover verification display states.

## Slice 9: Network canvas

Goal:
Implement graph/canvas cockpit.

Tasks:
- Organization nodes.
- Supplier/buyer/financier/opportunity edges.
- Status/risk visual encoding.
- Permission-filtered graph data.

Acceptance criteria:
- Unauthorized graph nodes are hidden.
- Canvas has empty/loading/error states.
- Tests cover graph data filtering.

## Slice 10: Integrations, operations, admin, and reports

Goal:
Complete operational views.

Tasks:
- ERP adapter status.
- Fabric adapter status.
- Webhook/outbox status.
- Backup/restore status.
- Admin users/roles.
- Reports exports.

Acceptance criteria:
- Integration failures are visible.
- Admin changes are audited.
- Reports align with UI contract.
