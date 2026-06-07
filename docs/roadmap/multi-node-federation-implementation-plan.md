# MEPN Multi-Node Federation Implementation Plan

Status: planned  
Target branch: `main`  
Codex workflow reference: <https://developers.openai.com/codex/use-cases/follow-goals>

## Direction

MEPN should move from one local demo database containing many organizations into a local multi-node demo where each Docker Compose node hosts exactly one organization. Each node owns its own PostgreSQL volume, object/evidence storage, users, roles, configuration, and local node identity.

The goal is to demonstrate the self-hosted organization-node vision, not to turn MEPN into a shared-cloud SaaS. Nodes should coordinate through simple backend-to-backend APIs that create synchronized local metadata for network/Fabric-channel relationships.

Real Fabric topology automation remains outside the normal application runtime. The local multi-node work should create simulated channel metadata and reviewer evidence only. Do not claim real Fabric channel creation, MSP enrollment, orderer administration, or verified Fabric proof unless a separate live Fabric Gateway proof flow passes.

## Codex master goal

Paste this into Codex as the top-level goal.

```text
/goal Implement MEPN local multi-node federation for self-hosted organization nodes.

Target state:
- The local demo runs 10 separate MEPN docker-compose nodes.
- Each compose node hosts exactly one organization.
- Each node has its own app, API, worker, PostgreSQL volume, Redis, MinIO, and port mapping.
- Seed data resets so each node database contains only users for that node's own organization.
- Every seeded user uses the default local/UAT password: password.
- The login page clearly shows seeded email/password credential guidance.
- Account profile allows a user to update their local/UAT password.
- Organization admin can create users and assign roles only to users registered under the same organization.
- Organization admin cannot assign roles to users from another node/organization.
- Organization admin can toggle which left-panel/sidebar items are visible for each user in the same organization.
- Admin receives 100% sidebar access by default.
- Non-admin sidebar visibility is computed from route authorization plus admin-configured sidebar toggles.
- Seven business entity nodes and three finance entity nodes are seeded.
- Business nodes can establish local simulated network/Fabric-channel metadata with each other.
- Finance nodes can establish a private finance-data channel with each other.
- Tender competition, private award/deal, and finance-data channels are preconfigured.
- Network canvas shows nodes, organizations, and channel relationships between compose nodes.
- Node-to-node backend API calls synchronize peer/channel metadata between local nodes.
- If an API does not exist, implement the simplest API that satisfies the SRS/SDD/ADR direction.
- If the current ADR blocks the intended local functionality, add a simple ADR for local simulated node federation while keeping real Fabric topology automation out of normal runtime.
- Root start.ps1 resets containers and volumes, rebuilds/restarts all compose nodes, runs migrations, reseeds each node, establishes preconfigured simulated channels, waits for health checks, and prints node URLs and seeded credentials.
- README.md documents the multi-node local setup, ports, seeded users, default password, reset command, and validation steps.
- UAT/e2e tests exercise the main use cases and capture screenshots from each relevant local port.
- Blockers are documented, fixed where feasible, then tests are rerun until acceptance criteria pass.

Validation loop:
1. Read SRS, SDD, ADRs, README, current schema, auth, sidebar, seed, Fabric governance, graph/canvas, Docker files, and tests.
2. Summarize current structure and gaps before editing.
3. Implement one vertical slice at a time.
4. Run migrations, seed, local node startup, unit tests, integration tests, e2e/UAT tests, and build.
5. Capture screenshots.
6. Record any blocker in docs/evidence/uat/USE_CASE_BLOCKERS.md or a new multi-node blocker report.
7. Fix blockers when they are within MVP scope.
8. Repeat until all acceptance criteria are satisfied.
```

## Current implementation summary

Existing foundations:

- Prisma already has `Organization`, `User`, `Role`, `Permission`, and `Membership`.
- Prisma already has Fabric governance metadata models for networks, channels, memberships, invitations, proposals, approvals, and evidence.
- Login already supports local/dev and seeded-password paths.
- Sidebar visibility already uses route metadata, role codes, permission codes, organization context, and deployment mode.
- Network canvas already shows project, procurement, finance, evidence, hash, and anchor relationships.
- UAT seed already creates a procurement-to-Mudarabah evidence chain.

Main gaps:

- Current UAT seed still represents many organizations in one database.
- Seeded default password must change from `mepn-demo-password` to `password`.
- Role model is globally scoped; organization-scoped custom roles need migration or a documented MVP fallback.
- Admin user/role assignment must be strictly same-organization scoped.
- Admin-controlled sidebar toggles do not exist yet.
- Network canvas does not yet show node deployments and channel relationships as first-class graph concepts.
- Node-to-node federation API does not exist yet.
- Root `start.ps1` should orchestrate all local nodes.
- README needs a multi-node setup section.

## Target nodes

| Node key | Organization | Type | Web | API |
|---|---|---|---:|---:|
| `amanah-retail` | Amanah Retail Sdn Bhd | business | 5173 | 3000 |
| `barakah-supplies` | Barakah Supplies Sdn Bhd | business | 5174 | 3001 |
| `ihsan-foods` | Ihsan Foods Manufacturing Sdn Bhd | business | 5175 | 3002 |
| `nur-logistics` | Nur Logistics Sdn Bhd | business | 5176 | 3003 |
| `salsabil-packaging` | Salsabil Packaging Sdn Bhd | business | 5177 | 3004 |
| `taqwa-office` | Taqwa Office Systems Sdn Bhd | business | 5178 | 3005 |
| `hikmah-health` | Hikmah Health Supplies Sdn Bhd | business | 5179 | 3006 |
| `mabrur-finance` | Mabrur Finance Partner | finance | 5180 | 3007 |
| `aman-capital` | Aman Capital Islamic Finance | finance | 5181 | 3008 |
| `safwa-growth` | Safwa SME Growth Fund | finance | 5182 | 3009 |

## Seeded users

Default local/UAT password for all seeded users: `password`.

Business nodes:

- `admin@<node>.local` / `ORG_ADMIN`
- `procurement@<node>.local` / `PROCUREMENT_OFFICER`
- `approver@<node>.local` / `APPROVER_MANAGER`
- `finance@<node>.local` / `FINANCE_ACCOUNTANT`
- `receiving@<node>.local` / `RECEIVING_OFFICER`
- `sales@<node>.local` / `SUPPLIER_SALES`
- `mudarib@<node>.local` / `MUDARIB_OPERATOR`

Finance nodes:

- `admin@<node>.local` / `ORG_ADMIN`
- `investment@<node>.local` / `INVESTMENT_OFFICER`
- `risk@<node>.local` / `RISK_REVIEWER`
- `disbursement@<node>.local` / `DISBURSEMENT_OFFICER`
- `audit@<node>.local` / `FINANCIER_AUDIT_VIEWER`

## Channel plan

1. `tender-market-channel`
   - Type: shared tender competition.
   - Members: all 7 business nodes.
   - Purpose: tender announcement, RFQ visibility, supplier bidding, and quotation competition metadata.

2. Private award/deal channels:
   - `award-amanah-barakah-channel`
   - `award-amanah-ihsan-channel`
   - `private-taqwa-salsabil-channel`
   - `private-hikmah-nur-channel`
   - Purpose: award announcement, private deal negotiation, delivery/payment evidence, and private procurement workspace.

3. `finance-data-channel`
   - Type: private finance entity data sharing.
   - Members: `mabrur-finance`, `aman-capital`, and `safwa-growth`.
   - Purpose: finance risk indicators, co-finance review metadata, and non-public finance collaboration.

4. Finance backup/support channels:
   - `finance-mabrur-barakah-channel`
   - `finance-aman-capital-ihsan-channel`
   - `finance-safwa-hikmah-channel`
   - Purpose: financing support, backup facility, project monitoring, and restricted evidence sharing.

## Implementation phases

### Phase 1: ADR and boundary alignment

Add `docs/adr/ADR-017-local-node-federation-simulation.md`.

Decision:

- Local/UAT MEPN may establish simulated channel metadata through backend-to-backend API calls.
- Simulated channel records may create peer, invitation, membership, audit, and graph/canvas evidence.
- Simulated channel records must not claim real Fabric topology mutation or verified Fabric proof.
- ADR-015 and ADR-016 remain authoritative for real Fabric topology/proof boundaries.

### Phase 2: Single-organization-per-node seed

Refactor `tests/uat/seed-uat-demo.mjs` so it accepts a node key and seeds exactly one organization when `MEPN_SINGLE_ORG_NODE=true`.

Required seed behavior:

- one organization per node database;
- local users only for that organization;
- default seeded password `password`;
- per-node procurement/finance demo data appropriate to the node type;
- external peer references represented as peer metadata, not full local users.

### Phase 3: Organization-scoped identity administration

Implement or tighten APIs so:

- admin can list only users under the same organization;
- admin can create users only under the same organization;
- admin can assign roles only to users under the same organization;
- admin cannot assign cross-organization roles;
- admin can create organization-scoped custom roles if the schema migration is accepted.

If full organization-scoped roles are too large for this slice, keep the single-primary-role model and document the limitation.

### Phase 4: Admin sidebar toggles

Add per-user navigation overrides.

Rules:

- `ORG_ADMIN` sees all authorized sidebar items by default.
- Non-admin route visibility = route authorization + admin-configured visibility toggle.
- Sidebar toggles do not grant backend permissions.
- Hidden left-panel items remain protected by route/API authorization.

UI:

- Add a `Sidebar access` area in `/admin/users`.
- Admin selects a same-organization user.
- Admin toggles route/module visibility.
- Admin saves overrides and can preview the effective sidebar.

### Phase 5: Password update

Add account password update:

- backend endpoint under `/api/v1/account/password` or equivalent;
- active membership check;
- current password verification;
- new password hash update;
- audit event;
- profile UI section for current/new/confirm password.

### Phase 6: Local node federation API

Add a node federation module.

Minimum API surface:

- status;
- peer list/create;
- peer ping;
- channel list/create;
- channel invitation;
- channel invitation accept;
- inbound event receiver;
- canvas data endpoint.

Use a simple local-only authentication boundary and document that production hardening is deferred.

### Phase 7: Multi-node Docker Compose

Add:

- `docker-compose.node.yml`;
- `.env.nodes/*.env` for the 10 nodes;
- unique port mapping per node;
- separate compose project name per node;
- separate volumes per node.

### Phase 8: Root startup/reset script

Create root `start.ps1`.

Required behavior:

1. optional full reset with volumes;
2. start/rebuild all node compose projects;
3. wait for health endpoints;
4. migrate every node database;
5. seed every node;
6. establish preconfigured simulated channels;
7. run UAT unless skipped;
8. print node URLs and seeded credential guidance.

### Phase 9: Network canvas extension

Extend graph node types:

- node deployment;
- organization node;
- tender channel;
- private award channel;
- finance data channel.

Extend graph relationships:

- hosted by;
- peers with;
- participates in channel;
- announces tender on;
- awarded through;
- shares finance data on;
- finance backup for.

Canvas should show all 10 nodes and the preconfigured channel relationships.

### Phase 10: README and evidence

Update README with:

- multi-node local setup;
- `./start.ps1 -ResetAll` command;
- node URL table;
- seeded user patterns;
- default password `password`;
- channel plan;
- local simulated federation boundary;
- UAT command;
- screenshot and blocker report paths.

Create/update:

- `docs/evidence/uat/MULTI_NODE_FEDERATION_RESULTS.md`;
- `docs/evidence/uat/MULTI_NODE_FEDERATION_BLOCKERS.md`;
- `docs/evidence/uat/screenshots/multi-node/`.

## UAT plan

Create `tests/e2e/multi-node-federation-uat.spec.ts`.

Test groups:

1. each node boots and exposes web/API;
2. each node reports exactly one local organization;
3. default password login works;
4. cross-node user login fails unless registered locally;
5. admin sees only same-organization users;
6. admin role assignment is same-organization only;
7. admin sidebar toggle changes non-admin left panel;
8. tender market channel exists across all 7 business nodes;
9. private award channels are visible only to members;
10. finance data channel is visible only to finance nodes;
11. finance backup channels are visible only to paired nodes;
12. network canvas shows node/channel relationships;
13. password update works;
14. README commands match actual startup behavior.

Screenshot output:

```text
docs/evidence/uat/screenshots/multi-node/
```

## Codex sub-goals

```text
Sub-goal 1: Add ADR-017 for local simulated node federation.
Sub-goal 2: Refactor seed to one organization per node with default password password.
Sub-goal 3: Enforce same-organization user/role administration.
Sub-goal 4: Implement per-user sidebar visibility toggles.
Sub-goal 5: Implement profile password update.
Sub-goal 6: Add docker-compose.node.yml, .env.nodes files, and root start.ps1.
Sub-goal 7: Implement node federation APIs and preconfigured simulated channels.
Sub-goal 8: Extend network canvas for node/channel relationships.
Sub-goal 9: Update README and UAT evidence docs.
Sub-goal 10: Run UAT loop until pass or documented blocker.
```

## Acceptance criteria

1. `./start.ps1 -ResetAll` starts 10 separate MEPN nodes.
2. Each node has its own database volume and exactly one local organization.
3. Each node exposes web and API on unique host ports.
4. All seeded users use default password `password`.
5. Users from one node cannot log in to another node unless registered there.
6. Organization admin can create users only inside the same organization.
7. Organization admin can assign roles only to users in the same organization.
8. Organization admin cannot assign roles from another organization.
9. Organization admin can toggle sidebar items per local user.
10. Admin has full sidebar access by default.
11. Sidebar toggle does not bypass backend authorization.
12. `tender-market-channel` is visible across all 7 business nodes.
13. Private award/deal channels are visible only to their member nodes.
14. `finance-data-channel` is visible only to the 3 finance nodes.
15. Finance backup/support channels are visible only to paired finance/business nodes.
16. Network canvas shows nodes, organizations, channels, and membership edges.
17. Node-to-node API sync creates mirrored channel metadata on invited nodes.
18. Simulated/local channel records are clearly labelled and not described as real Fabric proof.
19. Profile page allows password update.
20. README documents the multi-node setup.
21. UAT screenshots are saved.
22. Blockers are recorded and fixed where feasible.
23. Final validation passes:

```bash
corepack pnpm verify
corepack pnpm test:e2e -- tests/e2e/multi-node-federation-uat.spec.ts
```

## Non-goals

Do not implement or claim:

- production-ready Fabric topology mutation;
- automatic real Fabric channel creation through the normal app runtime;
- Fabric CA enrollment;
- storage of Fabric admin private keys in the normal app;
- real bank payment execution;
- real e-signature execution;
- production-grade node federation security;
- multi-tenant shared-cloud SaaS behavior.

## Final instruction to Codex

Implement in vertical slices. After each slice, run the relevant validation and update evidence. Keep language honest: this plan implements local simulated federation and channel metadata. It does not prove real Fabric topology automation or real Fabric proof unless a live Fabric Gateway and ReadAnchor verification pass are separately configured and evidenced.
