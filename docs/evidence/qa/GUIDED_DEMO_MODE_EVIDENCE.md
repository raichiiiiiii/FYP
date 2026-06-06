# Guided Demo Mode Evidence

## Purpose

Guided Demo Mode is a reviewer-value delighter. It provides an in-app checklist
for the FYP demo path without creating records, mutating workflow state, or
overriding Fabric/evidence verification.

## Scope

The guide covers:

- dashboard overview
- procurement hub and source-to-pay route
- finance opportunities and application workspace
- loss exception workflow evidence
- Fabric hash-record proof panel
- graph anchor/risk/saved-view overlay
- reports JSON export
- operations health/status
- evidence index and reviewer package

## Safety Rules

- The guide stores only local UI checklist progress in browser localStorage.
- It does not call mutation APIs.
- It does not create demo records.
- It does not mark real Fabric proof complete from mock state.
- The Fabric proof step is labelled environment-gated.
- Evidence links point to committed sanitized docs or screenshots only.

## Verification

| Command | Result |
|---|---|
| `corepack pnpm --dir apps/web test -- demoGuide` | Passed during implementation. |
| `corepack pnpm lint` | Passed during implementation. |
| `corepack pnpm typecheck` | Passed during implementation. |
| `corepack pnpm test:unit` | Passed during implementation. |
| `corepack pnpm build` | Passed during implementation. |
| `corepack pnpm test:e2e -- tests/e2e/21-guided-demo-mode.spec.ts` | Passed; screenshot captured. |

## Screenshot

| Screenshot | Description |
|---|---|
| `docs/evidence/uat/guided-demo-mode.png` | Guided demo checklist opened on a reviewer route. |

## Current Limitations

- The guide is a navigation/checklist aid, not a workflow automation engine.
- Manual review checkboxes are reviewer-local and do not represent backend
  business state.
- Environment-gated proof remains dependent on the configured Fabric runtime and
  existing Fabric UAT evidence.
