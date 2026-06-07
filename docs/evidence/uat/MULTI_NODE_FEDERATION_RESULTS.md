# Multi-Node Federation UAT Results

Last updated: 2026-06-07

This evidence file tracks progress toward the 10-node local federation demo.
It does not claim real Fabric topology mutation or real Fabric proof.

## Current Slice: Isolated Node Seed

Implemented:

- Added ADR-017 for local/UAT simulated node federation.
- Added the 10-node local federation catalog.
- Added `tests/uat/seed-uat-demo.mjs --node <node-key>`.
- Kept legacy all-in-one UAT seeding available through the default command and
  `--all-current-single-db-demo`.
- In single-node mode, the seed resets the target database and creates exactly
  one organization with only that node's users.
- Seeded local password is `password`; only password hashes are stored.

## Current Slice: Docker/Start Scaffolding

Implemented:

- Added `docker-compose.node.yml`.
- Added `.env.nodes/*.env` for 10 local demo nodes.
- Updated `.gitignore` so the committed local demo node env files and
  `start.ps1` are trackable.
- Replaced root `start.ps1` with a 10-node reset/start/migrate/seed/health
  workflow.
- Each node is mapped to a distinct web, API, PostgreSQL, Redis, and MinIO port.
- The script prints node URLs and `admin@<node>.local` account guidance.
- The script keeps Fabric in mock/simulated mode and does not attempt real
  topology automation.

## Current Slice: Node-Federation API

Implemented:

- Added node-federation persistence models for local node deployments, peers,
  simulated channels, memberships, outbound events, and inbound events.
- Added `GET /api/v1/node-federation/status`.
- Added peer registration and ping APIs.
- Added simulated channel create/invite/accept APIs.
- Added `POST /api/v1/node-federation/events` for local backend-to-backend
  invitation mirroring through a local shared-secret boundary.
- Added `GET /api/v1/node-federation/canvas` for reviewer-visible node/channel
  graph data.
- Updated the UAT seed so each seeded organization has a `NodeDeployment`.

Boundary:

- The APIs are local/UAT federation simulation APIs.
- They do not create real Fabric channels, join real Fabric channels, onboard
  MSP certificates, store Fabric admin private keys, or mark seeded proof as
  real Fabric verification.

## Current Slice: Preconfigured Channel Bootstrap

Implemented:

- Added `tests/uat/local-node-channel-plan.mjs`.
- Added `tests/uat/bootstrap-local-node-federation.mjs`.
- Updated `start.ps1` to call the bootstrap runner after all 10 nodes are
  migrated and seeded.
- The bootstrap runner logs in with each node's local `admin@<node>.local`
  account and creates/synchronizes the preconfigured simulated channel metadata
  through `/api/v1/node-federation/*`.

Preconfigured channels:

| Channel | Type | Members |
|---|---|---|
| `tender-market-channel` | `SHARED_TENDER_COMPETITION` | all 7 business nodes |
| `award-amanah-barakah-channel` | `PRIVATE_AWARD_OR_DEAL` | Amanah Retail, Barakah Supplies |
| `award-amanah-ihsan-channel` | `PRIVATE_AWARD_OR_DEAL` | Amanah Retail, Ihsan Foods |
| `private-taqwa-salsabil-channel` | `PRIVATE_AWARD_OR_DEAL` | Taqwa Office, Salsabil Packaging |
| `private-hikmah-nur-channel` | `PRIVATE_AWARD_OR_DEAL` | Hikmah Health, Nur Logistics |
| `finance-data-channel` | `FINANCE_ENTITY_DATA_SHARING` | Mabrur Finance, Aman Capital, Safwa Growth |
| `finance-mabrur-barakah-channel` | `FINANCE_BACKUP_SUPPORT` | Mabrur Finance, Barakah Supplies |
| `finance-aman-capital-ihsan-channel` | `FINANCE_BACKUP_SUPPORT` | Aman Capital, Ihsan Foods |
| `finance-safwa-hikmah-channel` | `FINANCE_BACKUP_SUPPORT` | Safwa Growth, Hikmah Health |

Boundary:

- The bootstrap uses local simulated metadata only.
- It does not mutate real Fabric topology.
- It does not produce real Fabric proof.

## Current Slice: Graph Route Federation Panel

Implemented:

- Added an API client hook for `GET /api/v1/node-federation/canvas`.
- Added a local federation panel to `/graph/projects`.
- The panel displays organization nodes, simulated channels, and relationship
  rows returned by the node-federation API.
- The panel explicitly labels the data as simulated metadata and states that
  real Fabric proof still requires live `ReadAnchor` verification.

Boundary:

- The panel does not show `verified=true`.
- The panel does not claim local simulated channels are real Fabric channels.
- Finance-data relationships are shown only when the current node's
  node-federation canvas contains them.

Completed in later slices:

- Multi-node rendered screenshots were captured from the local 10-node Docker
  stack under `docs/evidence/uat/screenshots/multi-node/`.

## Validation Evidence

Catalog test:

```text
corepack pnpm test:uat-catalog

3 tests passed
```

Docker/start scaffolding checks:

```text
powershell parser check for start.ps1
docker compose -f docker-compose.node.yml --env-file .env.nodes/amanah-retail.env config
docker compose -f docker-compose.node.yml --env-file .env.nodes/mabrur-finance.env config
```

Node-federation API checks:

```text
corepack pnpm --dir apps/api test:unit -- node-federation

1 test suite passed
4 tests passed

corepack pnpm --dir apps/api test:integration -- node-federation

1 test suite passed
4 tests passed
```

Channel-plan/bootstrap checks:

```text
corepack pnpm test:uat-catalog

2 suites passed
7 tests passed

node tests/uat/bootstrap-local-node-federation.mjs --dry-run

Dry-run printed 10 nodes and 9 preconfigured simulated channels with
realFabricTopologyMutation=false and realFabricProof=false.
```

Graph panel checks:

```text
corepack pnpm --dir apps/web test -- graph

3 test files passed
10 tests passed

corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build

All passed.
```

Rendered browser QA:

```text
Browser plugin runtime was available, but no in-app browser backend was
available in this session (`agent.browsers.list()` returned an empty list).
No screenshot was captured for this slice.
```

## Current Slice: Local Account Password Update

Implemented:

- Added `PATCH /api/v1/account/password`.
- The endpoint requires active organization membership, current password
  verification, and a new password of at least eight characters.
- The endpoint updates only the stored `passwordHash`.
- Audit event `ACCOUNT_PASSWORD_UPDATED` is written without password values.
- `/account/profile` now includes a local/UAT password update form.

Boundary:

- This is local/UAT seeded-password behavior.
- Production deployments should use OIDC or an approved identity boundary
  unless local password auth is explicitly enabled.

Validation:

```text
corepack pnpm --dir apps/api test:integration -- account-inbox

1 test suite passed
4 tests passed

corepack pnpm --dir apps/web test -- account

1 test file passed
3 tests passed
```

## Current Slice: Organization Admin Identity Hardening

Implemented:

- `POST /api/v1/users` now requires `organizationId` and `actorUserId` for an
  active same-organization `ORG_ADMIN`.
- `GET /api/v1/users` now requires the same organization-admin scope and returns
  only users with membership in that organization.
- `POST /api/v1/roles` and `GET /api/v1/roles` now require an
  organization-admin scope.
- `POST /api/v1/memberships` now requires an organization admin actor, validates
  the role exists, and rejects target users already registered under another
  organization.
- `GET /api/v1/orgs/:orgId/memberships` now requires an `actorUserId` query
  from an active admin in the same organization.
- `/admin/users` now calls scoped identity APIs and creates users with an
  initial role so the new account belongs to the current node organization.
- `/admin/roles` now calls the scoped role API.

Boundary:

- The MVP still uses globally unique `Role.code` and one primary role per
  `Membership`. Organization-scoped custom roles and multiple role assignments
  remain a later schema migration.
- Sidebar visibility overrides are not included in this slice.

Validation:

```text
corepack pnpm --dir apps/api test:integration -- identity-rbac

1 test suite passed
4 tests passed
```

## Current Slice: Admin-Controlled Sidebar Visibility

Implemented:

- Added `UserNavigationOverride` persistence for per-organization,
  per-user, per-route sidebar visibility.
- Added `GET /api/v1/admin/users/:userId/navigation`.
  - Same-organization users can read their own overrides.
  - Same-organization admins can inspect another user's overrides.
- Added `PATCH /api/v1/admin/users/:userId/navigation`.
  - Requires active same-organization `ORG_ADMIN`.
  - Rejects cross-organization target users.
  - Records `USER_NAVIGATION_OVERRIDES_UPDATED` audit events.
- `/admin/users` now includes a sidebar access panel where an admin selects a
  same-organization user and toggles left-panel route visibility.
- Sidebar rendering now computes:

```text
visible = route authorization allowed AND admin sidebar toggle allowed
```

- `ORG_ADMIN` keeps full sidebar access by default and ignores per-user sidebar
  hiding when acting as an admin.

Boundary:

- Sidebar visibility does not grant permissions.
- Sidebar visibility does not bypass route guards or backend API guards.
- Hidden route menu items remain protected by route authorization if opened
  directly.

Validation:

```text
corepack pnpm --dir apps/api test:integration -- identity-rbac

1 test suite passed
5 tests passed

corepack pnpm --dir apps/web test -- authorization identity Sidebar

3 test files passed
23 tests passed
```

## Current Slice: Multi-Node UAT Spec And Screenshot Runner

Implemented:

- Added `tests/e2e/multi-node-federation-uat.spec.ts`.
- The spec is opt-in through `MEPN_MULTI_NODE_UAT=true` so normal single-node
  `test:e2e` remains deterministic.
- The spec validates all 10 node API health endpoints and login pages.
- The spec logs in through seeded local password auth for every node admin.
- The spec asserts a cross-node user cannot log in to another node.
- The spec validates synchronized simulated channel metadata for:
  - `tender-market-channel`
  - `award-amanah-barakah-channel`
  - `finance-data-channel`
  - `finance-mabrur-barakah-channel`
- The spec validates representative node-federation canvas API output for a
  buyer node and a finance node.
- The spec captures rendered screenshots under:

```text
docs/evidence/uat/screenshots/multi-node/
```

- Updated `start.ps1` so running without `-SkipUat` executes the multi-node
  UAT spec after health checks, migrations, seed, and simulated channel
  bootstrap.
- Updated `tests/e2e/setup-e2e.mjs` to skip the single-node E2E database setup
  when `MEPN_MULTI_NODE_UAT=true`.

Boundary:

- The spec asserts simulated metadata only.
- It does not claim real Fabric topology mutation.
- It does not claim real Fabric proof.

Validation:

```text
corepack pnpm test:e2e -- tests/e2e/multi-node-federation-uat.spec.ts

Skipped by default unless MEPN_MULTI_NODE_UAT=true.

MEPN_MULTI_NODE_UAT=true corepack pnpm test:e2e -- tests/e2e/multi-node-federation-uat.spec.ts

6 tests passed

powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1 -ResetAll -NoBuild

Completed successfully:
- stopped the legacy single-node local Docker stack;
- reset and started all 10 local node stacks;
- migrated and seeded all 10 local node databases;
- bootstrapped 9 preconfigured simulated federation channels;
- ran the enabled multi-node UAT spec;
- captured 24 screenshots under docs/evidence/uat/screenshots/multi-node/.
```

Screenshot evidence:

```text
docs/evidence/uat/screenshots/multi-node/login-*.png
docs/evidence/uat/screenshots/multi-node/dashboard-*.png
docs/evidence/uat/screenshots/multi-node/canvas-amanah-retail.png
docs/evidence/uat/screenshots/multi-node/canvas-mabrur-finance.png
docs/evidence/uat/screenshots/multi-node/admin-users-sidebar-amanah-retail.png
docs/evidence/uat/screenshots/multi-node/profile-password-amanah-retail.png
```

Single-node seed command:

```text
DATABASE_URL=postgresql://mepn:<redacted>@localhost:5432/mepn_e2e \
node tests/uat/seed-uat-demo.mjs --node amanah-retail
```

Direct database verification after the seed:

```json
{
  "organizationCount": 1,
  "membershipCount": 7,
  "userEmails": [
    "admin@amanah-retail.local",
    "approver@amanah-retail.local",
    "finance@amanah-retail.local",
    "mudarib@amanah-retail.local",
    "procurement@amanah-retail.local",
    "receiving@amanah-retail.local",
    "sales@amanah-retail.local"
  ],
  "allUsersBelongToNode": true
}
```

Finance-node seed command:

```text
DATABASE_URL=postgresql://mepn:<redacted>@localhost:5432/mepn_e2e \
node tests/uat/seed-uat-demo.mjs --node mabrur-finance
```

Direct database verification after the finance-node seed:

```json
{
  "organizationCount": 1,
  "organization": {
    "legalName": "Mabrur Finance Partner",
    "deploymentMode": "financial_entity_node"
  },
  "userEmails": [
    "admin@mabrur-finance.local",
    "audit@mabrur-finance.local",
    "disbursement@mabrur-finance.local",
    "investment@mabrur-finance.local",
    "risk@mabrur-finance.local"
  ],
  "allUsersBelongToNode": true
}
```

## Remaining Work

- No remaining blocker for the local/UAT simulated multi-node federation slice.
- Real Fabric channel creation/join/MSP onboarding remains outside the app
  runtime by accepted UAT-B-003 boundary.
- Real Fabric proof remains gated by live Gateway `ReadAnchor` verification
  under UAT-B-004.
