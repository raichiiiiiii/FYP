# MEPN Testing Strategy

## 1. Static checks

Commands:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
```

Purpose:

- catch syntax errors
- catch type errors
- enforce style
- prevent broken imports

## 2. Unit tests

Scope:

- RBAC helpers
- route visibility rules
- workflow state machines
- validation functions
- status badge mapping
- ledger calculation helpers
- audit verification helpers

Required examples:

- user without financier role cannot see financier-only routes
- non-revenue opportunity cannot submit mudarabah application
- profit distribution does not calculate guaranteed return
- Fabric anchor status renders pending, verified, failed, and unavailable correctly

## 3. Component tests

Scope:

- Sidebar
- Dashboard
- Applications list
- Application workspace tabs
- Procurement forms
- Ledger table
- Audit timeline
- Integration status cards

Required states:

- loading
- empty
- populated
- validation error
- permission denied
- integration unavailable

## 4. Integration tests

Scope:

- route protection
- workflow progression
- evidence checklist behavior
- reviewer decision flow
- audit event creation
- outbox/Fabric pending display

## 5. End-to-end tests

Core flows:

- login as SME admin and view dashboard
- create requisition
- approve requisition
- create RFQ
- compare quotation
- create PO
- create opportunity from revenue document
- submit mudarabah application
- financier reviews application
- Shariah reviewer approves or rejects
- contract/disbursement state visible
- audit verification visible

## 6. Accessibility tests

Commands:

```bash
pnpm test:a11y
pnpm test:e2e -- tests/e2e/19-critical-route-accessibility.spec.ts
```

Scope:

- keyboard navigation
- visible focus
- contrast
- form labels
- tab order
- error messaging
- modal/dialog behavior

Current coverage:

- login smoke route
- dashboard
- procurement hub
- finance application workspace
- audit/evidence routes
- network canvas
- reports
- admin users

Evidence:

- `docs/evidence/qa/ACCESSIBILITY_EVIDENCE.md`

## 7. Deployment smoke tests

After cloud deployment:

```bash
curl -I http://YOUR_PUBLIC_IP
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100
```

Smoke-test checklist:

- home page loads
- API health endpoint returns healthy if API exists
- database connection works if backend exists
- Redis/queue connection works if used
- object storage works if used
- login works if auth exists
- dashboard loads
- audit/outbox status visible
- application logs show no crash loop

## Repeatable Verification Command

Use the root verification command before claiming implementation is complete:

```bash
pnpm verify
```

Current root `verify` runs:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Formatter Setup Note

`pnpm format:check` is a required quality gate in the target strategy, but the
current root workspace does not yet define a root formatter check. Add it once
the repository has a shared Prettier configuration for all packages.
