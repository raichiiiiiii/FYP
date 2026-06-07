# Multi-Node Federation Blockers

Last updated: 2026-06-07

## Active Blockers

None for the isolated node seed, Docker/start scaffolding, backend
node-federation API, preconfigured channel bootstrap, graph route federation
panel, local password update, organization-admin identity hardening, sidebar
visibility override, or multi-node UAT spec slices.

## Open Implementation Items

These are not blockers for the current slice, but remain required for the full
multi-node federation objective:

- Execute `.\start.ps1 -ResetAll` without `-SkipUat` to run
  `tests/e2e/multi-node-federation-uat.spec.ts` against the 10 local nodes and
  capture screenshots from every relevant local port.

## Resolved Items

2026-06-07:

- 10-node Docker Compose topology scaffold added through `docker-compose.node.yml`.
- Per-node local demo env files added under `.env.nodes/`.
- Root `start.ps1` now supports reset/start/migrate/seed/health checks across
  the 10 local nodes.
- Backend node-federation APIs now support local simulated peers, channels,
  invitations, inbound events with a local shared-secret boundary, and canvas
  DTOs.
- `start.ps1` now calls `tests/uat/bootstrap-local-node-federation.mjs` to
  establish the preconfigured simulated tender, award/deal, finance-data, and
  finance-support channels after seed.
- `/graph/projects` now includes an API-backed local node-federation panel.
- `/account/profile` now supports local/UAT password updates through
  `PATCH /api/v1/account/password`.
- User, role, and membership administration now requires an active
  same-organization `ORG_ADMIN` actor. Membership assignment rejects target
  users already registered under another organization.
- Admin-controlled sidebar visibility overrides are persisted per
  organization/user/route path. Non-admin sidebars apply route authorization
  first and then admin visibility toggles. `ORG_ADMIN` keeps full sidebar access
  by default.
- `tests/e2e/multi-node-federation-uat.spec.ts` now covers local node health,
  seeded password login, cross-node login rejection, simulated channel metadata,
  representative node-federation canvas APIs, and screenshot capture paths.
- `start.ps1` now runs the multi-node UAT spec when `-SkipUat` is not supplied.
- `tests/e2e/setup-e2e.mjs` skips single-node E2E database preparation when
  `MEPN_MULTI_NODE_UAT=true`.

## Validation Limitations

2026-06-07:

- Rendered browser screenshot capture for the graph panel was attempted through
  the available Browser plugin, but no in-app browser backend was available in
  this session. `agent.browsers.list()` returned an empty list.
- Code-level graph validation passed through focused web tests, lint,
  typecheck, and build. Multi-node screenshot evidence remains pending until
  the 10-node Docker stack is run with Playwright using the new UAT spec.

## Boundary Notes

- Simulated federation does not create real Fabric channels.
- Simulated channel membership does not prove real MSP onboarding.
- Seeded or simulated hash metadata must not be marked as real Fabric proof.
- Real proof remains gated by live Fabric Gateway `ReadAnchor` verification.
