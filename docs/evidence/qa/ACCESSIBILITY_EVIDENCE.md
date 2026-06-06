# Accessibility Automation Evidence

## Status

Implemented for the current FYP review scope.

The repository now includes automated accessibility checks using
`@axe-core/playwright`. The checks cover a login smoke route and demo-critical
authenticated routes with API-backed seeded data.

## Source Evidence

| Area | Evidence |
|---|---|
| Dependency | `package.json` -> `@axe-core/playwright` |
| Root command | `package.json` -> `test:a11y` |
| Helper | `tests/e2e/accessibility.helpers.ts` |
| Login smoke spec | `tests/e2e/18-accessibility-smoke.spec.ts` |
| Critical-route spec | `tests/e2e/19-critical-route-accessibility.spec.ts` |
| Fixed UI code | `apps/web/src/features/auth/LoginPage.tsx`, `apps/web/src/features/finance/FinanceRoute.tsx`, `apps/web/src/features/graph/GraphRoute.tsx`, `apps/web/src/index.css`, `apps/web/src/App.css` |

## Coverage

| Route group | Coverage |
|---|---|
| Login | Axe scan plus heading checks through `test:a11y`. |
| Dashboard | Axe scan and keyboard focus movement. |
| Procurement hub | Axe scan and keyboard focus movement. |
| Finance workspace | Axe scan and keyboard focus movement. |
| Audit/evidence | Axe scan and keyboard focus movement. |
| Network canvas | Axe scan and keyboard focus movement. |
| Reports | Axe scan and keyboard focus movement. |
| Admin users | Axe scan and keyboard focus movement. |

## Verification Commands

```powershell
corepack pnpm test:a11y
corepack pnpm test:e2e -- tests/e2e/19-critical-route-accessibility.spec.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

Latest targeted result:

- Login accessibility smoke: passed.
- Critical-route accessibility spec: passed.
- Lint/typecheck/build: passed.

## Issues Found And Fixed

| Issue | Fix |
|---|---|
| Login page nested `<main>` landmark inside the app shell `<main>`. | Replaced the login page inner landmark with a non-landmark container. |
| Finance readiness bar used `aria-label` on a non-role div. | Added `role="progressbar"` with min/max/current values. |
| Graph inspector used a nested `aside` complementary landmark. | Replaced it with a labelled non-landmark panel. |
| Muted text/status chip contrast was slightly below AA on pale backgrounds. | Darkened the shared muted color token. |
| Graph legend opacity made disabled filter labels unreadable. | Removed opacity-based dimming from graph legend text. |

## Known Limitations

- The automation currently checks serious/moderate axe violations and basic
  focus movement. It does not replace manual screen-reader review.
- It does not yet run in CI as a separate named job; `test:a11y` is available as
  a repeatable local/reviewer command.
- Mobile-specific accessibility checks remain future hardening.
