# Auth OIDC And Invitation UAT Evidence

## Purpose

This evidence package records the current production-auth hardening slice:

- development login is controlled by backend `DEV_AUTH_ENABLED`;
- OIDC start/callback backend flow exists with signed state, nonce, and claim
  validation;
- invitation tokens are stored as hashes only;
- invitation acceptance is backend-owned and audited;
- frontend login and invitation screens use backend auth configuration.

## Environment

- Date/time: 2026-06-06
- Branch: `main`
- Auth mode verified: local/UAT dev auth enabled
- OIDC provider mode verified: backend test-provider adapter only
- Real external OIDC provider: not configured in this evidence package

No passwords, OIDC client secrets, tokens, PEM blocks, or private keys are
included.

## Commands Run

```powershell
corepack pnpm --dir apps/api test:unit -- auth.config
corepack pnpm --dir apps/api test:unit -- invitation-token
corepack pnpm --dir apps/api test:integration -- auth
corepack pnpm test:e2e -- tests/e2e/09-auth-flow.spec.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

## Result

| Check | Result |
|---|---|
| Dev login allowed when explicitly enabled | Passed |
| Dev login rejected when disabled | Passed |
| Invitation token hash persistence | Passed |
| Invitation create/list/revoke/accept API | Passed |
| OIDC test-provider state/nonce/claim validation | Passed |
| Invalid OIDC issuer/audience/expiry rejection | Passed |
| Login screen uses backend auth config | Passed |
| Invitation acceptance creates local UAT session | Passed |

## Screenshot Evidence

| Screenshot | Description |
|---|---|
| `docs/evidence/uat/auth-login-dev-mode.png` | Login screen in local/UAT mode with backend-enabled dev login. |
| `docs/evidence/uat/auth-invitation-acceptance.png` | Invitation acceptance screen after backend token validation. |

## Current Limitations

- Real external OIDC provider token exchange is not configured or claimed.
- OIDC test-provider flow validates state, nonce, issuer, audience, expiry, and
  membership mapping, but it is not a substitute for provider JWKS/signature
  verification.
- Dev login remains available for local/UAT only when `DEV_AUTH_ENABLED=true`
  or the runtime is not production.
