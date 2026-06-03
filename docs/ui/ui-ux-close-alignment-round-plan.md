# UI/UX Close Alignment Round Plan

## Purpose

This plan defines the working baseline for the next MEPN UI/UX implementation
round. The goal is to move the current production UI closer to the approved UI
contract and Figma Make visual reference without importing prototype code or
weakening production workflow, audit, permission, or finance rules.

## Baseline

| Item | Baseline |
|---|---|
| Date | 2026-06-04 |
| Branch | `main` |
| Baseline commit | `0032bb1` |
| Current verification state | Full Playwright E2E and root `verify` passed before this phase. |
| Figma reference location | `docs/design/figma-make-reference/` |
| Production frontend | `apps/web/src/` |
| Production API | `apps/api/src/` |

## Source-Of-Truth Order

Follow the repository source-of-truth order:

1. `docs/requirements/mudarabah_eprocurement_srs.tex`
2. `docs/design/mepn_software_design_description.tex`
3. `docs/ui/mepn-ui-contract-flow.md`
4. `docs/ui/mepn-ui-contract-flow-appendix.md`
5. `docs/ui/figma-to-ui-contract-map.md`
6. `docs/design/figma-make-reference/`
7. Existing production code

The Figma Make prototype remains visual and interaction reference only. It must
not be imported by production application code and must not override business
rules, authorization, validation, workflow states, audit behavior, Fabric
anchoring, ledger calculations, or deployment behavior.

## Phase 0 Audit Findings

### Current Production UI State

- Production routing is centralized in `apps/web/src/app/router.tsx`.
- Route metadata and role-aware navigation are centralized in
  `apps/web/src/app/navigation.ts` and `apps/web/src/app/authorization.ts`.
- The app shell, sidebar, page header, and module layout are under
  `apps/web/src/layouts/`.
- Shared components exist for buttons, fields, cards, tables, status display,
  tabs, loading, empty, error, confirmation, and workflow stepper states.
- Raw HTTP access is centralized in `apps/web/src/shared/api/`; feature screens
  use API hooks rather than direct `fetch` calls.
- Feature modules exist for dashboard, auth, organization, identity,
  procurement, evidence, audit, finance, graph, integrations, and operations.
- Backend modules exist for auth, identity, procurement, evidence, finance,
  audit, graph, integrations, and outbox.

### Current Figma Reference State

- The exported Figma Make prototype is stored under
  `docs/design/figma-make-reference/prototype-src/`.
- Captured Make reference screenshots exist under `docs/ui/assets/` for 16
  major views.
- The reference covers landing, sign-in/role selection, organization setup,
  dashboard, platform manager dashboard, procurement hub, application pipeline,
  application workspace, finance opportunities, network canvas, ledger/P&L,
  audit verification, integrations, operations, admin, and reports.
- The prototype includes mock data, local role switching, local state, mock
  audit/Fabric state, and prototype-only routing. These are not production
  authority.

### Screens That Already Align Closely

- Dashboard has role-aware KPI/task foundations and health visibility.
- Application workspace has tabbed finance review structure and E2E coverage.
- Finance opportunities enforce revenue-generating eligibility.
- Evidence/audit surfaces expose hashes, timelines, evidence packs, and mock
  Fabric status honestly.
- Project graph/canvas has permission-filtered graph data and source-record
  navigation.
- Integrations expose outbox/adapter state and avoid fake success.

### Screens That Visibly Drift From Figma

- App shell and sidebar are functional but visually simpler than the Figma Make
  reference.
- Landing, sign-in, and onboarding are more skeletal than the Figma cloud-entry
  and organization setup flows.
- Procurement screens prove workflow coverage but do not yet match the Figma
  procurement hub density, tabs, analytics, exception handling, or supplier
  scoring direction.
- Application workspace has working workflow coverage, but its visual hierarchy
  and reviewer panels need closer alignment.
- Ledger/P&L and closure are domain-safe but need clearer reviewer-grade
  explanation and visual hierarchy.
- Admin, reports, and operations are present but need stronger review-ready
  layout and content depth.

### Screens Using Fixtures Or Partial API Data

- Dashboard KPI/task/signal data still uses role-aware fixture/model logic.
- Some integration and operations states rely on mock adapter or local status
  records.
- Some summary surfaces need dedicated backend DTOs before visual polish can be
  fully accurate.
- Admin and report surfaces need stronger API-backed data before final UAT
  polish.

### High-Risk Areas

- RBAC and direct route access.
- Procurement state transitions and audit events.
- Mudarabah application evidence, due diligence, Shariah review, approval,
  contract, disbursement, ledger, profit/loss, and closure.
- Evidence pack export, hash verification, and Fabric anchor status.
- Outbox/integration retry state and reconciliation records.
- Any UI that could imply payment, disbursement, Fabric anchoring, or ledger
  closure succeeded without backend evidence.

## Proposed Phase Sequence

| Phase | Area | Goal | Primary docs | Production areas |
|---|---|---|---|---|
| 0 | Setup and baseline | Create tracker, blocker TODO, and baseline audit. | `AGENTS.md`, UI assessment docs, testing docs | `docs/ui/` |
| 1 | App shell and sidebar | Align shell density, navigation hierarchy, status widgets, and responsive behavior. | UI contract 13, Figma `Sidebar.tsx` | `app/`, `layouts/`, `shared/components/` |
| 2 | Landing, auth, org setup | Improve cloud entry, dev login, invite/onboarding, and first-run organization setup. | UI contract 16.2, 16.3, 26 | `features/auth/`, `features/organization/` |
| 3 | Dashboard | Make role dashboards closer to Figma cockpit while preserving API-backed health and role rules. | UI contract 16.5 | `features/dashboard/` |
| 4 | Procurement | Improve procurement hub, requisition detail, approval, supplier, RFQ, PO, matching UX. | UI contract 16.6 to 16.8 | `features/procurement/` |
| 5 | Applications and opportunities | Align application pipeline and revenue-backed opportunity screens. | UI contract 16.10 | `features/finance/applications/`, `features/finance/opportunities/` |
| 6 | Application workspace | Improve finance workspace panels for evidence, due diligence, Shariah, contract, disbursement, audit. | UI contract 6, 16.11, 16.12 | `features/finance/` |
| 7 | Ledger, P/L, closure | Improve project ledger, profit/loss explanation, distribution, loss exception, and closure review. | UI contract 16.13 | `features/finance/ledger`, `FinanceRoute.tsx` |
| 8 | Evidence and audit | Improve documents, evidence pack detail/export, hash verification, timeline, and anchor state UX. | UI contract 16.9 | `features/evidence/`, `features/audit/` |
| 9 | Graph/canvas | Align graph cockpit layout, filters, overlays, and source navigation. | UI contract 16.14 | `features/graph/` |
| 10 | Integrations and operations | Improve adapter status, outbox, retry, reconciliation, deployment health, backup visibility. | UI contract 16.15, 16.1 | `features/integrations/`, `features/operations/` |
| 11 | Admin and reports | Improve users, roles, permissions, settings, reports, exports, and auditability. | UI contract 16.4, 16.16 | `features/identity/`, future reports area |
| 12 | Accessibility and responsive QA | Verify keyboard, focus, labels, tab order, mobile layout, and contrast. | Testing strategy, UAT docs | Whole web app |
| 13 | UAT evidence pass | Capture screenshots, defects, pass/fail status, and supervisor notes. | UAT readiness/checklist | `docs/testing/`, `docs/ui/assets/` |

## Implementation Rules For Later Phases

- Implement one vertical slice at a time.
- Do not copy Figma Make code wholesale.
- Use Figma screenshots and source for visual hierarchy only.
- Preserve production routing, RBAC, API hooks, audit/outbox rules, and domain
  workflow gates.
- Add or update tests for route visibility, form validation, workflow state,
  permission-denied states, loading/empty/error states, and high-risk domain
  rules.
- Update `docs/ui/ui-ux-close-alignment-blockers-todo.md` whenever a phase
  cannot safely continue.

## Phase 0 Verification Plan

Run:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Record results in the final Phase 0 summary.

## Phase 0 Verification Results

| Command | Result | Notes |
|---|---|---|
| `corepack pnpm lint` | Pass | Workspace lint/type checks passed for API, worker, web, shared, and config packages. |
| `corepack pnpm typecheck` | Pass | Web TypeScript project build passed. |
| `corepack pnpm test` | Pass | API unit tests, worker unit tests, web Vitest tests, and package no-test placeholders passed. |
| `corepack pnpm build` | Pass | Web, API, and worker production builds passed. |

Phase 0 changed documentation only. Full Playwright E2E was not rerun in this
phase because no production source behavior changed.
