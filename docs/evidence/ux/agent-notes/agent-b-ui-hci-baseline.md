# Agent B UI/HCI Baseline Notes

Date: 2026-06-07
Agent: Agent B - UI route health baseline scaffolding
Workspace: `C:\Users\User\dev\FYP`
Repository: `raichiiiiiii/FYP`
Push status: Not pushed.

## Current Structure Summary

- `apps/web` contains the React/Vite UI, route metadata, protected route wrapper, and feature routes.
- `apps/api` contains the Nest/Prisma API used by Playwright fixtures.
- `tests/e2e` contains Playwright system tests and shared helpers.
- `docs/evidence/ux` contains UX/HCI evidence, screenshot indexes, and agent notes.

## Relevant Requirements

- SRS requires protected organization-scoped access, procurement-backed mudarabah finance workflows, graph/canvas visibility, audit evidence, truthful Fabric proof separation, and operations visibility.
- SDD maps these requirements to protected web routes, API modules, observability/ops, authorization, graph no-leak behavior, and secret-safe evidence.
- UI contracts require route-level role/permission discipline and protected-route behavior that does not depend only on frontend hiding.

## Relevant UI Contract Sections

- `docs/ui/mepn-ui-contract-flow.md`: route visibility contract for finance and graph routes; backend enforcement expectation.
- `docs/ui/mepn-ui-contract-flow-appendix.md`: protected route model, route inventory, operations health contract, and finance/graph route map.
- `docs/ui/figma-to-ui-contract-map.md`: maps Figma reference components to production route responsibilities.

## Relevant Figma Files

Visual references only:

- `docs/design/figma-make-reference/prototype-src/src/app/components/DashboardView.tsx`
- `docs/design/figma-make-reference/prototype-src/src/app/components/OpportunitiesView.tsx`
- `docs/design/figma-make-reference/prototype-src/src/app/components/ApplicationsList.tsx`
- `docs/design/figma-make-reference/prototype-src/src/app/components/ApplicationWorkspace.tsx`
- `docs/design/figma-make-reference/prototype-src/src/app/components/LedgerView.tsx`
- `docs/design/figma-make-reference/prototype-src/src/app/components/NetworkCanvas.tsx`
- `docs/design/figma-make-reference/prototype-src/src/app/components/OperationsView.tsx`

## Gap List

- The prior baseline text claimed historical validation and screenshots that were not produced by this pass.
- The route-health documentation did not expose all requested audit columns in a single current matrix.
- The route-health spec mixed baseline health checks with route-specific interaction assertions.
- Fresh screenshots are pending; no screenshot was fabricated for this scaffold.

## Implementation Plan

- Keep the route-health scope limited to the six critical routes.
- Use existing Playwright helpers for database reset, organization fixture creation, and session injection.
- Fail on the requested rendered error strings and conservative fatal diagnostics.
- Capture screenshots only when a route fails.
- Refresh UX evidence docs with truthful pending/captured status.

## Files Changed

- `tests/e2e/00-route-health.spec.ts`
- `docs/evidence/ux/UI_ROUTE_HEALTH_AUDIT.md`
- `docs/evidence/ux/SCREENSHOT_INDEX.md`
- `docs/evidence/ux/agent-notes/agent-b-ui-hci-baseline.md`

## Validation

Run in this pass:

- `corepack pnpm exec playwright test tests/e2e/00-route-health.spec.ts --list` - passed; listed 6 route-health tests.
- `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` - passed on 2026-06-07; 6 route-health checks passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed after the seeded role-code mapping was committed separately.
- `corepack pnpm test:unit` - passed.
- `corepack pnpm build` - passed after the seeded role-code mapping was committed separately.

## Blockers

- No blocker for login helper discovery; `setSession` and API fixture helpers are available.
- No current route-health blocker from the latest local run.
- The earlier seeded role-code TypeScript blocker was resolved in `c722fa9 feat(auth): map seeded node roles to app access`.
