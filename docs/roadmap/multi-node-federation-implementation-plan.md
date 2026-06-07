# MEPN Multi-Node Federation Required Implementation Plan

Status: partial implementation in progress
Scope: required implementation plan only.  
Boundary: keep real Fabric topology automation and real Fabric proof boundaries intact; implement local/UAT simulated node federation first.

Progress as of 2026-06-07:

- Phase 1 ADR accepted.
- Phase 2 isolated node seed implemented.
- Phase 3 10-node catalog implemented.
- Phase 6 backend node-federation API implemented.
- Phase 10 Docker Compose/start scaffolding implemented.
- Preconfigured channel bootstrap implemented.
- Remaining work: graph/canvas UI rendering, admin sidebar overrides, password
  update UI/API, multi-node E2E screenshots.

## Direction for the implementation plan

Implement this plan in phase order. The objective is to make MEPN demonstrably local-first and self-hosted, where each Docker Compose node hosts exactly one organization and participates in local simulated network/Fabric-channel metadata with other nodes.

Do not collapse this into a high-level master goal. Treat this file as the implementation checklist. Work phase by phase, record blockers, fix blockers where feasible, update README/evidence, and rerun the local/UAT loop until the phase requirements are satisfied.

## Required implementation plan

### Phase 1 — Add ADR for local node federation

Current ADR-015 says direct Fabric topology automation remains outside the normal app runtime. That should not be deleted. Instead, add a new ADR.

Create:

```text
docs/adr/ADR-017-local-node-federation-simulation.md
```

Purpose:

Allow local/UAT node-to-node API federation and simulated Fabric channel establishment between separately hosted MEPN nodes.

Decision:

- For local/UAT, MEPN may establish simulated Fabric/network channels through backend-to-backend API calls.
- These simulated channels create metadata, channel membership records, invitation records, audit events, graph/canvas relationships, and operator evidence.
- These APIs do not create real Fabric channels, do not enroll MSP material, do not mutate orderer/channel config, and do not store Fabric admin private keys.
- Channel status values must make the boundary visible:
  - `simulated_proposed`
  - `simulated_invited`
  - `simulated_joined`
  - `simulated_active`
  - `operator_pending`
  - `real_fabric_unavailable`
- Real Fabric topology automation remains future operator-agent work.

Why:

The project needs local multi-node behavior now so the self-hosted node vision can be reviewed, but real Fabric topology automation requires security/key-custody hardening that is intentionally outside the MVP.

### Phase 2 — Convert seed model from “many organizations in one node” to “one organization per node”

Current seed creates all seeded organizations inside one database. It should become parameterized.

Modify:

```text
tests/uat/seed-uat-demo.mjs
```

Add flags:

- `--node amanah-retail`
- `--node barakah-supplies`
- `--node ihsan-foods`
- `--node nur-logistics`
- `--node salsabil-packaging`
- `--node taqwa-office`
- `--node hikmah-health`
- `--node mabrur-finance`
- `--node aman-capital`
- `--node safwa-growth`
- `--all-current-single-db-demo` optional legacy mode only

Environment:

- `MEPN_NODE_KEY`
- `MEPN_NODE_ORG_TYPE`
- `MEPN_NODE_ORG_NAME`
- `MEPN_NODE_PUBLIC_WEB_URL`
- `MEPN_NODE_PUBLIC_API_URL`
- `MEPN_SINGLE_ORG_NODE=true`

Seed rule:

- When `MEPN_SINGLE_ORG_NODE=true`, seed exactly one `Organization`.
- Seed only users belonging to that organization.
- Do not seed users from other organizations into this node database.
- Cross-node parties should be represented as external peers, not full local users.

Password:

- Replace current seeded password with: `password`

Update:

- `README.md`
- `docs/evidence/uat/seeded-node-accounts.txt`
- login page helper copy
- UAT tests

### Phase 3 — Seed 10 organization nodes

Use 7 business entities and 3 finance entities.

#### Business entity nodes

1. `amanah-retail`
   - Organization: Amanah Retail Sdn Bhd
   - Type: `BUSINESS_BUYER_SUPPLIER`
   - Web: `http://localhost:5173`
   - API: `http://localhost:3000`
   - Main function: retail buyer, tender issuer

2. `barakah-supplies`
   - Organization: Barakah Supplies Sdn Bhd
   - Type: `BUSINESS_SUPPLIER_MUDARIB`
   - Web: `http://localhost:5174`
   - API: `http://localhost:3001`
   - Main function: halal goods supplier, mudarib

3. `ihsan-foods`
   - Organization: Ihsan Foods Manufacturing Sdn Bhd
   - Type: `BUSINESS_SUPPLIER`
   - Web: `http://localhost:5175`
   - API: `http://localhost:3002`
   - Main function: food manufacturer and tender bidder

4. `nur-logistics`
   - Organization: Nur Logistics Sdn Bhd
   - Type: `BUSINESS_SUPPLIER`
   - Web: `http://localhost:5176`
   - API: `http://localhost:3003`
   - Main function: logistics supplier

5. `salsabil-packaging`
   - Organization: Salsabil Packaging Sdn Bhd
   - Type: `BUSINESS_SUPPLIER`
   - Web: `http://localhost:5177`
   - API: `http://localhost:3004`
   - Main function: packaging supplier

6. `taqwa-office`
   - Organization: Taqwa Office Systems Sdn Bhd
   - Type: `BUSINESS_BUYER_SUPPLIER`
   - Web: `http://localhost:5178`
   - API: `http://localhost:3005`
   - Main function: office procurement and supply business

7. `hikmah-health`
   - Organization: Hikmah Health Supplies Sdn Bhd
   - Type: `BUSINESS_SUPPLIER`
   - Web: `http://localhost:5179`
   - API: `http://localhost:3006`
   - Main function: medical/health supplies supplier

#### Finance entity nodes

8. `mabrur-finance`
   - Organization: Mabrur Finance Partner
   - Type: `FINANCE_ENTITY`
   - Web: `http://localhost:5180`
   - API: `http://localhost:3007`
   - Main function: mudarabah finance provider

9. `aman-capital`
   - Organization: Aman Capital Islamic Finance
   - Type: `FINANCE_ENTITY`
   - Web: `http://localhost:5181`
   - API: `http://localhost:3008`
   - Main function: SME finance and risk review

10. `safwa-growth`
    - Organization: Safwa SME Growth Fund
    - Type: `FINANCE_ENTITY`
    - Web: `http://localhost:5182`
    - API: `http://localhost:3009`
    - Main function: backup finance and co-finance review

For each business node, seed:

```text
Default password for all users:
password

Users per business node:
- admin@<node>.local                ORG_ADMIN
- procurement@<node>.local          PROCUREMENT_OFFICER
- approver@<node>.local             APPROVER_MANAGER
- finance@<node>.local              FINANCE_ACCOUNTANT
- receiving@<node>.local            RECEIVING_OFFICER
- sales@<node>.local                SUPPLIER_SALES
- mudarib@<node>.local              MUDARIB_OPERATOR
```

For each finance node, seed:

```text
Default password for all users:
password

Users per finance node:
- admin@<node>.local                ORG_ADMIN
- investment@<node>.local           INVESTMENT_OFFICER
- risk@<node>.local                 RISK_REVIEWER
- disbursement@<node>.local         DISBURSEMENT_OFFICER
- audit@<node>.local                FINANCIER_AUDIT_VIEWER
```

### Phase 4 — Enforce same-organization admin role assignment

Current Users Admin UI creates users and assigns memberships using current `organizationId`, but it still loads `/users` and `/roles`, and the schema has globally unique roles.

Relevant files:

- `apps/web/src/features/identity/UsersAdmin.tsx`
- `apps/api/prisma/schema.prisma`

Backend rules:

- Only `ORG_ADMIN` may create users in the current node organization.
- Admin may only list users whose `membership.organizationId` equals the admin's `organizationId`.
- Admin may only assign roles to users who already belong to the same organization.
- Admin may only assign system roles allowed for this organization type or custom roles owned by this organization.
- Admin must not see users from other organization nodes.
- Admin must not assign roles to users from another node.
- Admin must not assign roles owned by another organization.

Schema change:

- Make `Role` organization-scoped:
  - `Role.organizationId` nullable
  - `Role.isSystemRole` boolean
  - `@@unique([organizationId, code])`

Better membership model:

- Add `MembershipRoleAssignment` if multiple roles are needed.
- If keeping MVP simple, keep one primary role per membership but explicitly enforce same-organization assignment.

API changes:

- `GET /api/v1/users?organizationId=<current>`
- `GET /api/v1/roles?organizationId=<current>`
- `POST /api/v1/users`
- `POST /api/v1/memberships`

Add backend guard:

```text
assertActorOrgAdmin(actorUserId, organizationId)
assertTargetUserInOrganization(userId, organizationId)
assertRoleAssignableInOrganization(roleId, organizationId)
```

### Phase 5 — Add admin-controlled left-panel toggles

The current sidebar already filters routes by role, deployment mode, and permissions. Add a second filter layer: admin-configured user visibility.

Relevant files:

- `apps/web/src/app/authorization.ts`
- `apps/web/src/app/navigation.ts`
- `apps/web/src/layouts/Sidebar.tsx`

Schema:

```text
NavigationItem
  id
  routePath
  label
  module
  isDefaultVisible
  createdAt
  updatedAt

UserNavigationOverride
  id
  organizationId
  userId
  routePath
  visible
  setByUserId
  createdAt
  updatedAt
```

Seed:

- Seed `NavigationItem` from `apps/web/src/app/navigation.ts` `routeMetadata`.
- `ORG_ADMIN` gets all visible routes by default.
- Other users get defaults based on business rules of what a user can do and existing role metadata.

Effective sidebar rule:

```text
visible = routeAuthAllowed && adminToggleAllowed
```

Important:

- Sidebar toggle only controls menu visibility.
- It must not override backend authorization.
- It must not grant permissions.
- Hidden routes should be hidden from left panel but still protected by route/API authorization.

UI:

- Add tab in `/admin/users`: `Sidebar access`.
- Admin selects a user from same organization.
- Admin toggles route/module items.
- Save overrides.
- Preview effective sidebar for that user.

API:

- `GET /api/v1/admin/users/:id/navigation?organizationId=<org>&actorUserId=<admin>`
- `PATCH /api/v1/admin/users/:id/navigation`

### Phase 6 — Implement local node federation APIs

Status: implemented for backend local/UAT simulation.

Existing Fabric governance APIs are useful but they are local metadata/readiness APIs. They do not currently do node-to-node federation. Add a thin local federation layer that calls peer node backends.

New module:

```text
apps/api/src/modules/node-federation/
```

New models:

- `NodeDeployment`
- `NodePeer`
- `NodeChannel`
- `NodeChannelMembership`
- `OutboundNodeEvent`
- `InboundNodeEvent`

Simple API:

- `GET  /api/v1/node-federation/status`
- `GET  /api/v1/node-federation/peers`
- `POST /api/v1/node-federation/peers`
- `POST /api/v1/node-federation/peers/:peerId/ping`
- `GET  /api/v1/node-federation/channels`
- `POST /api/v1/node-federation/channels`
- `POST /api/v1/node-federation/channels/:channelId/invite`
- `POST /api/v1/node-federation/invitations/:invitationId/accept`
- `POST /api/v1/node-federation/events`
- `GET  /api/v1/node-federation/canvas`

Minimal local authentication:

- Use `NODE_FEDERATION_SHARED_SECRET` for local demo.
- Send a local node key header and a local node shared-secret header.

No complex production security now. Mark all of this as local/UAT only.

The federation service should internally call existing Fabric governance behavior where possible.

When creating a simulated channel:

1. Create local `NodeChannel`.
2. Create or mirror `FabricNetwork`/`FabricChannel` metadata.
3. Create channel membership for local node.
4. Send invitation event to remote node backend.
5. Remote node stores peer invitation and mirror channel metadata.
6. Remote admin or preconfigured script accepts invitation.
7. Channel becomes `simulated_active` once all configured peers join.
8. Network canvas displays node-to-channel edges.

### Phase 7 — Preconfigure three channel types

#### 1. Shared tender competition channel

Name:

```text
tender-market-channel
```

Type:

```text
SHARED_TENDER_COMPETITION
```

Members:

```text
All 7 business entity nodes
```

Purpose:

```text
Tender announcement, RFQ visibility, supplier bidding, quotation competition metadata.
```

Canvas relationship:

```text
Business node -- participates_in --> tender-market-channel
```

#### 2. Direct private award/deal channels

Names:

```text
award-amanah-barakah-channel
award-amanah-ihsan-channel
private-taqwa-salsabil-channel
private-hikmah-nur-channel
```

Type:

```text
PRIVATE_AWARD_OR_DEAL
```

Members:

```text
Buyer business node + selected supplier business node
```

Purpose:

```text
Tender award announcement, private deal negotiation, delivery/payment evidence, private procurement workspace.
```

Canvas relationship:

```text
Buyer node -- awarded_to --> supplier node
Buyer node -- private_channel --> award channel
Supplier node -- private_channel --> award channel
```

#### 3. Finance entity private data channel

Name:

```text
finance-data-channel
```

Type:

```text
FINANCE_ENTITY_DATA_SHARING
```

Members:

```text
mabrur-finance
aman-capital
safwa-growth
```

Purpose:

```text
Finance risk indicators, business support data, co-finance review metadata, non-public finance collaboration.
```

Canvas relationship:

```text
Finance node -- shares_risk_data_on --> finance-data-channel
```

#### 4. Finance backup/support channels

Names:

```text
finance-mabrur-barakah-channel
finance-aman-capital-ihsan-channel
finance-safwa-hikmah-channel
```

Type:

```text
FINANCE_BACKUP_SUPPORT
```

Members:

```text
One finance entity + one business entity
```

Purpose:

```text
Financing support, backup facility, project monitoring, restricted evidence sharing.
```

### Phase 8 — Extend network canvas to show nodes and channels

Current graph node types do not include Fabric channel or node deployment, and relationships do not include channel membership.

Relevant files:

- `apps/web/src/features/graph/GraphRoute.tsx`
- `apps/web/src/features/graph/model/networkGraph.types.ts`
- `apps/web/src/features/graph/model/networkGraph.model.ts`

Add graph node types:

- `node_deployment`
- `organization_node`
- `fabric_channel`
- `tender_channel`
- `private_award_channel`
- `finance_data_channel`

Add graph relationships:

- `hosts`
- `peers_with`
- `participates_in_channel`
- `announces_tender_on`
- `submits_bid_on`
- `awarded_private_channel`
- `shares_finance_data_on`
- `finance_backup_for`

Update:

- `apps/web/src/features/graph/model/networkGraph.types.ts`
- `apps/web/src/features/graph/model/networkGraph.model.ts`
- graph API response DTO
- `GraphRoute` legend
- `GraphCanvas` inspector panel

Network canvas should show:

- 10 application nodes
- each node's organization
- channel membership edges
- tender channel
- private award/deal channels
- finance data channel
- finance backup/support channels
- channel status:
  - `proposed`
  - `invited`
  - `accepted`
  - `simulated_active`
  - `operator_pending`
  - `real_fabric_unavailable`

### Phase 9 — Login and password changes

Change default seeded password:

- From: `mepn-demo-password`
- To: `password`

Update:

- `tests/uat/seed-uat-demo.mjs`
- `README.md`
- `docs/evidence/uat/seeded-node-accounts.txt`
- login page hint copy
- UAT tests

Add profile password update:

```http
PATCH /api/v1/account/password
```

Request:

```json
{
  "organizationId": "...",
  "actorUserId": "...",
  "currentPassword": "...",
  "newPassword": "..."
}
```

Local/UAT validation:

- confirm active membership
- verify current password
- update `passwordHash`
- create audit event `ACCOUNT_PASSWORD_UPDATED`

UI:

- Add password section to `/account/profile`.
- Fields:
  - current password
  - new password
  - confirm new password
- Show local/UAT warning.

### Phase 10 — Create multi-node Docker Compose setup

Current local compose starts one PostgreSQL, one Redis, and one MinIO. Current production compose is also a single deployment with fixed service/container names.

Add:

- `docker-compose.node.yml`
- `.env.nodes/amanah-retail.env`
- `.env.nodes/barakah-supplies.env`
- `.env.nodes/ihsan-foods.env`
- `.env.nodes/nur-logistics.env`
- `.env.nodes/salsabil-packaging.env`
- `.env.nodes/taqwa-office.env`
- `.env.nodes/hikmah-health.env`
- `.env.nodes/mabrur-finance.env`
- `.env.nodes/aman-capital.env`
- `.env.nodes/safwa-growth.env`

Required env per node:

- `COMPOSE_PROJECT_NAME`
- `MEPN_NODE_KEY`
- `MEPN_NODE_ORG_NAME`
- `MEPN_NODE_ORG_TYPE`
- `MEPN_SINGLE_ORG_NODE=true`
- `WEB_HOST_PORT`
- `API_HOST_PORT`
- `POSTGRES_HOST_PORT`
- `REDIS_HOST_PORT`
- `MINIO_API_HOST_PORT`
- `MINIO_CONSOLE_HOST_PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `VITE_API_BASE_URL`
- `LOCAL_PASSWORD_AUTH_ENABLED=true`
- `DEV_AUTH_ENABLED=false`
- `NODE_FEDERATION_SHARED_SECRET=<local-demo-shared-secret>`

Port allocation:

```text
amanah-retail       web 5173   api 3000   pg 5432   redis 6379   minio 9000/9001
barakah-supplies    web 5174   api 3001   pg 5442   redis 6380   minio 9010/9011
ihsan-foods         web 5175   api 3002   pg 5443   redis 6381   minio 9020/9021
nur-logistics       web 5176   api 3003   pg 5444   redis 6382   minio 9030/9031
salsabil-packaging  web 5177   api 3004   pg 5445   redis 6383   minio 9040/9041
taqwa-office        web 5178   api 3005   pg 5446   redis 6384   minio 9050/9051
hikmah-health       web 5179   api 3006   pg 5447   redis 6385   minio 9060/9061
mabrur-finance      web 5180   api 3007   pg 5448   redis 6386   minio 9070/9071
aman-capital        web 5181   api 3008   pg 5449   redis 6387   minio 9080/9081
safwa-growth        web 5182   api 3009   pg 5450   redis 6388   minio 9090/9091
```

### Phase 11 — Add or replace root `start.ps1`

I did not find a root `start.ps1` in the repository, so create one rather than update an existing file.

```powershell
param(
  [switch]$ResetAll,
  [switch]$NoBuild,
  [switch]$SkipUat
)

$ErrorActionPreference = "Stop"

$nodes = @(
  "amanah-retail",
  "barakah-supplies",
  "ihsan-foods",
  "nur-logistics",
  "salsabil-packaging",
  "taqwa-office",
  "hikmah-health",
  "mabrur-finance",
  "aman-capital",
  "safwa-growth"
)

Write-Host "MEPN local multi-node startup"

corepack enable
corepack pnpm install

if ($ResetAll) {
  foreach ($node in $nodes) {
    docker compose `
      -p "mepn-$node" `
      -f docker-compose.node.yml `
      --env-file ".env.nodes/$node.env" `
      down -v --remove-orphans
  }
}

foreach ($node in $nodes) {
  $buildArg = if ($NoBuild) { "" } else { "--build" }

  docker compose `
    -p "mepn-$node" `
    -f docker-compose.node.yml `
    --env-file ".env.nodes/$node.env" `
    up -d $buildArg
}

foreach ($node in $nodes) {
  Write-Host "Waiting for node $node health..."
  # wait loop:
  # read API_HOST_PORT from env file
  # poll http://localhost:<port>/api/v1/health
}

foreach ($node in $nodes) {
  Write-Host "Migrating and seeding $node..."
  # docker compose exec api prisma migrate deploy
  # docker compose exec api node tests/uat/seed-uat-demo.mjs --node $node
}

Write-Host "Establishing preconfigured local simulated Fabric/network channels..."
# Call:
# POST amanah /node-federation/channels tender-market-channel
# POST each business node invitation accept
# POST private award/deal channels
# POST finance-data-channel across finance nodes
# POST finance backup/support channels

if (-not $SkipUat) {
  corepack pnpm test:e2e -- tests/e2e/multi-node-federation-uat.spec.ts
}

Write-Host "MEPN nodes ready."
Write-Host "Default local password for seeded users: password"
Write-Host "Amanah Retail:      http://localhost:5173"
Write-Host "Barakah Supplies:   http://localhost:5174"
Write-Host "Ihsan Foods:        http://localhost:5175"
Write-Host "Nur Logistics:      http://localhost:5176"
Write-Host "Salsabil Packaging: http://localhost:5177"
Write-Host "Taqwa Office:       http://localhost:5178"
Write-Host "Hikmah Health:      http://localhost:5179"
Write-Host "Mabrur Finance:     http://localhost:5180"
Write-Host "Aman Capital:       http://localhost:5181"
Write-Host "Safwa Growth:       http://localhost:5182"
```

### Phase 12 — UAT loop and screenshots

Create:

- `tests/e2e/multi-node-federation-uat.spec.ts`
- `docs/evidence/uat/MULTI_NODE_FEDERATION_RESULTS.md`
- `docs/evidence/uat/MULTI_NODE_FEDERATION_BLOCKERS.md`
- `docs/evidence/uat/screenshots/multi-node/`

Test groups:

1. Node boot:
   - each node health endpoint passes
   - each web port loads login page
   - each node reports exactly one local organization

2. Login:
   - admin login works on each node
   - password = password
   - wrong password fails
   - user from another node cannot login on this node

3. Organization admin:
   - admin sees only local organization users
   - admin creates local user
   - admin assigns local role
   - admin cannot assign cross-node user/role

4. Sidebar toggles:
   - admin has full sidebar
   - admin toggles module for a user
   - user logs in and left panel changes
   - backend route guard still blocks unauthorized action

5. Tender channel:
   - `tender-market-channel` exists
   - all 7 business nodes joined
   - canvas shows channel membership

6. Private award channel:
   - direct buyer-supplier channel exists
   - only intended business nodes joined
   - canvas shows private channel

7. Finance data channel:
   - 3 finance nodes joined
   - business nodes cannot see finance private data channel unless invited

8. Finance backup channel:
   - finance-business private channel exists
   - canvas shows finance support edge

9. Profile password:
   - user changes password
   - old password fails
   - new password succeeds

10. README/start script:
    - `start.ps1 -ResetAll` can rebuild/reseed/restart
    - README commands match actual behavior

Screenshots:

- one login screenshot per node type
- one admin users screenshot
- one sidebar toggle screenshot
- one tender-market-channel canvas screenshot
- one private award channel screenshot
- one finance-data-channel screenshot
- one profile password update screenshot

## README update plan

Add or replace the current local setup with a multi-node local setup section. The current README already has single-node local setup and self-hosted node setup, but it still references the old seed password and one local stack.

README.md additions:

```text
## Local Multi-Node Federation Demo

Purpose:
Run 10 local MEPN self-hosted organization nodes on one machine.

Command:
.\start.ps1 -ResetAll

Default seeded password:
password

Node URLs:
- Amanah Retail:      http://localhost:5173
- Barakah Supplies:   http://localhost:5174
- Ihsan Foods:        http://localhost:5175
- Nur Logistics:      http://localhost:5176
- Salsabil Packaging: http://localhost:5177
- Taqwa Office:       http://localhost:5178
- Hikmah Health:      http://localhost:5179
- Mabrur Finance:     http://localhost:5180
- Aman Capital:       http://localhost:5181
- Safwa Growth:       http://localhost:5182

Important local/UAT boundary:
- Each node hosts exactly one organization.
- Each node owns its own database volume.
- Node-to-node channels are local simulated federation channels.
- Real Fabric topology mutation is not performed by the normal app runtime.
- Mock/simulated channel status must not be described as real Fabric proof.

Validation:
corepack pnpm test:e2e -- tests/e2e/multi-node-federation-uat.spec.ts

Evidence:
docs/evidence/uat/MULTI_NODE_FEDERATION_RESULTS.md
docs/evidence/uat/MULTI_NODE_FEDERATION_BLOCKERS.md
docs/evidence/uat/screenshots/multi-node/
```
