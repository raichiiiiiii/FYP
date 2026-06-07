# Multi-Node Business Activity Simulation Evidence

Last updated: 2026-06-07

## Purpose

This evidence records the local/UAT business-activity simulation for the
10-node MEPN federation demo. The simulation ensures every seeded user in each
local node has at least seven role-relevant activities, so reviewers can inspect
feature usage through audit and inbox surfaces.

## Scope

Seeded local federation:

- 7 business nodes.
- 3 finance nodes.
- 64 seeded users total.
- Minimum 7 activities per seeded user.
- Expected total after all nodes are seeded:
  - 448 `AuditEvent` records.
  - 448 `InboxItem` records.
  - 896 UAT activity records total.

## Implementation

Activity templates:

```text
tests/uat/local-node-business-activity.mjs
```

Simulator:

```text
tests/uat/simulate-node-business-activity.mjs
```

Startup integration:

```text
start.ps1
```

The simulator runs after `tests/uat/seed-uat-demo.mjs --node <node-key>` for
each node started by `start.ps1`.

## Evidence Boundary

- Activity records are local/UAT simulation records only.
- Activity records are written as `AuditEvent` rows and `InboxItem` rows.
- The simulator does not create or mutate production workflow state.
- The simulator does not execute real payment or disbursement actions.
- The simulator does not calculate guaranteed/fixed mudarabah returns.
- The simulator does not create real Fabric topology.
- The simulator does not mark seeded/mock Fabric evidence as verified.

Each record includes metadata marking it as:

```json
{
  "localUatOnly": true,
  "safeForEvidence": true,
  "simulatedOnly": true,
  "realFabricProof": false,
  "realPaymentExecution": false
}
```

## Role Coverage

Business-node roles:

- `ORG_ADMIN`
- `PROCUREMENT_OFFICER`
- `APPROVER_MANAGER`
- `FINANCE_ACCOUNTANT`
- `RECEIVING_OFFICER`
- `SUPPLIER_SALES`
- `MUDARIB_OPERATOR`

Finance-node roles:

- `ORG_ADMIN`
- `INVESTMENT_OFFICER`
- `RISK_REVIEWER`
- `DISBURSEMENT_OFFICER`
- `FINANCIER_AUDIT_VIEWER`

Every role above has at least seven route-aware activities.

## Validation

Static catalog validation:

```text
corepack pnpm test:uat-catalog

10 tests passed
```

Single-node simulator smoke:

```text
node tests/uat/simulate-node-business-activity.mjs --node amanah-retail

7 users
49 AuditEvent records
49 InboxItem records
98 total UAT activity records
```

Full 10-node validation is performed by:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1 -ResetAll -NoBuild
```

The startup script prints one simulation summary per node after seeding.

Startup seed-path validation:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1 -SeedOnly -SkipUat

passed
```

Latest 10-node local validation:

```text
amanah-retail: users=7 audit=49 inbox=49
barakah-supplies: users=7 audit=49 inbox=49
ihsan-foods: users=7 audit=49 inbox=49
nur-logistics: users=7 audit=49 inbox=49
salsabil-packaging: users=7 audit=49 inbox=49
taqwa-office: users=7 audit=49 inbox=49
hikmah-health: users=7 audit=49 inbox=49
mabrur-finance: users=5 audit=35 inbox=35
aman-capital: users=5 audit=35 inbox=35
safwa-growth: users=5 audit=35 inbox=35
```

Total records validated:

```text
64 users
448 AuditEvent records
448 InboxItem records
896 UAT activity records
```
