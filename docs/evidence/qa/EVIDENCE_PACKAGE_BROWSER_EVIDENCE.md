# Evidence Package Browser Evidence

## Purpose

The Evidence Package Browser is a read-only reviewer page that lists curated
roadmap, validation, deployment, Fabric, QA/UAT, screenshot, blocker, and
remaining-hardening evidence.

## Scope

- Route: `/evidence-package`
- Runtime source: committed frontend evidence manifest
- Mutations: none
- Filesystem reads at runtime: none
- Secret material display: not allowed

## Verification

| Command | Result |
|---|---|
| `corepack pnpm --dir apps/web test -- evidencePackage` | Passed during implementation. |
| `corepack pnpm lint` | Passed during implementation. |
| `corepack pnpm typecheck` | Passed during implementation. |
| `corepack pnpm test:unit` | Passed during implementation. |
| `corepack pnpm build` | Passed during implementation. |
| `corepack pnpm test:e2e -- tests/e2e/22-evidence-package-browser.spec.ts` | Passed; screenshot captured. |

## Screenshot

| Screenshot | Description |
|---|---|
| `docs/evidence/uat/evidence-package-browser.png` | Evidence Package Browser with roadmap, Fabric, QA/UAT, screenshot, blocker, and hardening evidence groups. |

## Safety Checks

The E2E test asserts that the page does not render secret-format strings such as
private-key markers, certificate markers, configured secret names, or simple
credential assignment patterns.

## Limitations

- The page links curated committed evidence. It does not fetch or parse local
  Markdown files at runtime.
- It does not certify production readiness; production hardening remains labelled
  separately.
