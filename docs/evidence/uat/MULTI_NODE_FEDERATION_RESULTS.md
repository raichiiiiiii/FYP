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

Pending in later slices:

- Preconfigured simulated tender, award, finance-data, and support channels.
- Multi-node canvas rendering and screenshots.

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

- Extend graph/canvas to show node/channel relationships.
- Preconfigure simulated tender, award/deal, finance-data, and support
  channels through startup automation.
- Add multi-node E2E/UAT screenshots from each local port.
