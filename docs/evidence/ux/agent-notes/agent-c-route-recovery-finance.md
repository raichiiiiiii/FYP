# Agent C - Route Recovery: Dashboard + Finance

Date: 2026-06-06

## Branch And Worktree

- Branch: `feature/ui-hci-route-recovery-finance`
- Worktree: `C:\Users\User\dev\FYP-ui-hci-finance`
- Base includes: `4d418f2 feat(graph): add graph annotation api`

## Assigned Scope

Verified and recovered only:

- `/dashboard`
- `/finance/opportunities`
- `/finance/applications`
- `/finance/contracts`

## Files Changed

- `apps/web/src/App.css`
- `tests/e2e/00-route-health.spec.ts`
- `docs/evidence/ux/UI_ROUTE_HEALTH_AUDIT.md`
- `docs/evidence/ux/agent-notes/agent-c-route-recovery-finance.md`
- `docs/evidence/ux/screenshots/after-dashboard.png`
- `docs/evidence/ux/screenshots/after-finance-opportunities.png`
- `docs/evidence/ux/screenshots/after-finance-applications.png`
- `docs/evidence/ux/screenshots/after-finance-contracts.png`

## Route Findings

| Route | Status | Notes |
|---|---|---|
| `/dashboard` | Healthy | Rendered dashboard cockpit, health panel, smart task inbox, and refresh interaction. |
| `/finance/opportunities` | Healthy | Rendered opportunities route, backend finance summary, opportunity records, and navigation interaction. |
| `/finance/applications` | Fixed | Reproduced desktop overflow that clipped the `Open workspace` action. Fixed the application pipeline card grid so it wraps before overflowing the content shell. |
| `/finance/contracts` | Healthy | Rendered contract creation route and contract records section; signer email field interaction passed. |

## Screenshots / Evidence

- `docs/evidence/ux/screenshots/after-dashboard.png`
- `docs/evidence/ux/screenshots/after-finance-opportunities.png`
- `docs/evidence/ux/screenshots/after-finance-applications.png`
- `docs/evidence/ux/screenshots/after-finance-contracts.png`
- `docs/evidence/ux/UI_ROUTE_HEALTH_AUDIT.md`

## Tests Run

- `corepack pnpm install --frozen-lockfile` - passed; `pkcs11js` native rebuild reported missing VC++ toolset, but pnpm completed successfully and Prisma generated.
- Browser plugin attempt - blocked: `Browser is not available: iab`; used repo Playwright path.
- Temporary screenshot route-health checker - passed before converting the checker to the committed route-health spec.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test:unit` - passed.
- `corepack pnpm test:integration` - passed; existing `pg@9` deprecation warning emitted.
- `corepack pnpm test:e2e -- tests/e2e/00-route-health.spec.ts` - passed.
- `corepack pnpm build` - passed; Vite emitted the existing large chunk warning.

## Blockers

- In-app Browser backend `iab` was unavailable in this session, so rendered verification used Playwright.

## Recommended Next Steps

- Keep `tests/e2e/00-route-health.spec.ts` as the focused assigned-route smoke check for this recovery branch.
- Review other dense card/list routes for the same hidden horizontal overflow pattern in a later UI hardening pass.
- Do not merge without the full lint, typecheck, unit, integration, e2e route-health, and build validation suite passing.
