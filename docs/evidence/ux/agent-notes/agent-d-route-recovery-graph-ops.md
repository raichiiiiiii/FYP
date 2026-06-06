# Agent D - Route Recovery: Graph + Operations

Date: 2026-06-06

## Branch And Worktree

- Branch: `feature/ui-hci-route-recovery-graph-ops`
- Worktree: `C:\Users\User\dev\FYP-ui-hci-graph-ops`
- Starting HEAD: `4d418f2 feat(graph): add graph annotation api`
- Push status: not pushed.

## Scope

Verified and recovered only:

- `/graph/projects`
- `/operations`

No product route failure was reproduced, so this slice is evidence-only.

## Current Structure Summary

- Web app: `apps/web` React/Vite routes with `RequireAuth`, centralized route metadata, feature modules, and Playwright E2E coverage.
- API: `apps/api` NestJS services with Prisma migrations and integration tests.
- Worker: `apps/worker` queue/integration background behavior with integration tests.
- Route surfaces: graph UI lives under `apps/web/src/features/graph`; operations UI lives under `apps/web/src/features/operations` and consumes integration/health data.

## Relevant Requirements And Contracts

- SRS UC-13 / FR-43 to FR-46: authorized graph model, canvas filtering, risk/status markings, and graph access control.
- SRS UC-01 / NFR-10 / NFR-13 / NFR-19 to NFR-22: self-hosted deployment, health checks, observability, backup/deployment readiness, and release/dependency visibility.
- SDD Graph/Canvas: nodes, edges, annotations, overlays, and authorization-aware graph views.
- SDD Observability/Ops: health checks, logs, metrics, alerts, and backup/restore diagnostics.
- UI contract sections: operations health/readiness contract and procurement project graph entry contract.
- Figma visual references only: `NetworkCanvas.tsx` and `OperationsView.tsx`.

## Gap List

- `tests/e2e/00-route-health.spec.ts` is not present in this worktree.
- No assigned route-health failure reproduced.
- No graph source files were changed, so graph-targeted API tests were not required.

## Files Changed

- `docs/evidence/ux/UI_ROUTE_HEALTH_AUDIT.md`
- `docs/evidence/ux/agent-notes/agent-d-route-recovery-graph-ops.md`
- `docs/evidence/ux/screenshots/after-graph-projects.png`
- `docs/evidence/ux/screenshots/after-operations.png`

## Verification And Evidence

- `/graph/projects`: healthy. Existing route E2E opens the project network canvas, exercises graph filters and saved views, verifies source navigation, validates anchor overlays, and preserves role-based finance no-leak behavior.
- `/operations`: healthy. Existing route E2E opens deployment/runtime health, verifies operations timeline filters, shows Fabric failure honestly, and confirms the reviewer timeline does not expose PEM/password/token/private-key strings.
- Screenshots:
  - `docs/evidence/ux/screenshots/after-graph-projects.png`
  - `docs/evidence/ux/screenshots/after-operations.png`

## Tests Run

- `corepack pnpm install --frozen-lockfile` - passed; optional `pkcs11js` native rebuild failed due missing local Visual Studio C++ toolset, but pnpm exited 0 and Prisma generated.
- `corepack pnpm test:e2e -- tests/e2e/12-read-only-project-graph.spec.ts tests/e2e/24-operations-timeline.spec.ts` - passed, 2 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test:unit` - passed.
- `corepack pnpm test:integration` - passed; existing pg deprecation warning observed.
- `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` - skipped because `tests/e2e/00-route-health.spec.ts` is absent.
- `corepack pnpm build` - passed; existing Vite chunk-size warning observed.

## Blockers

- None.

## Recommended Next Steps

- If another route-recovery branch introduces a shared route-health spec, add these two routes to that shared route list.
- Keep the existing graph no-leak E2E as a required guard before future graph UI work consumes the Agent A graph annotation API.
