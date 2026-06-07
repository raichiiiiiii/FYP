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

## Validation Evidence

Catalog test:

```text
corepack pnpm test:uat-catalog

3 tests passed
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

- Create multi-node Docker Compose configuration.
- Update `start.ps1` to reset and start all 10 nodes.
- Add node-federation APIs and simulated channel synchronization.
- Extend graph/canvas to show node/channel relationships.
- Add multi-node E2E/UAT screenshots from each local port.
