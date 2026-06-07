# SRS Use Case Simulation Results

Last updated: 2026-06-07

Runner:

```bash
corepack pnpm test:e2e -- tests/e2e/use-case-specification-uat.spec.ts
```

Seed command used by the runner:

```bash
corepack pnpm seed:uat
```

Seeded demo password for local/demo accounts:

```text
mepn-demo-password
```

The seed stores only a password hash. Local/UAT seeded-password login is
available outside production for reviewer simulation. This does not introduce a
production password-auth policy; production deployments should use configured
OIDC or an approved identity boundary unless local password auth is explicitly
accepted.

## Safety Notes

- Fabric proof is not faked. Seeded hash records remain local/pending unless a
  live Fabric Gateway ReadAnchor verification succeeds.
- Fabric topology automation is not implemented. The readiness/governance seed
  records operator-assisted metadata only.
- Mudarabah profit/loss seed data uses ratio-based profit distribution and does
  not implement guaranteed or fixed returns.
- Screenshots must be reviewed before commit if regenerated locally.

## Results Matrix

| Use case | Actor | Route under test | Screenshot | Current result source |
|---|---|---|---|---|
| UC-01 Install and configure SME node | `buyer.admin@amanah.local` | `/organization/profile` | `docs/evidence/uat/screenshots/UC-01-install-node.png` | Playwright route simulation |
| UC-02 Authenticate and authorize user | `procurement.officer@amanah.local` | `/dashboard` | `docs/evidence/uat/screenshots/UC-02-authenticate.png` | Playwright route simulation plus seeded password-login E2E coverage |
| UC-03 Onboard supplier | `procurement.officer@amanah.local` | `/procurement/suppliers` | `docs/evidence/uat/screenshots/UC-03-onboard-supplier.png` | Playwright route simulation |
| UC-04 Run RFQ and supplier evaluation | `procurement.officer@amanah.local` | `/procurement/rfqs` | `docs/evidence/uat/screenshots/UC-04-rfq-evaluation.png` | Playwright route simulation |
| UC-05 Execute procure-to-pay workflow | `finance.accountant@amanah.local` | `/procurement/matching` | `docs/evidence/uat/screenshots/UC-05-p2p.png` | Playwright route simulation |
| UC-06 Publish procurement opportunity | `mudarib.operator@barakah.local` | `/finance/opportunities` | `docs/evidence/uat/screenshots/UC-06-publish-opportunity.png` | Playwright route simulation with partial cross-node note |
| UC-07 Apply for mudarabah capital | `mudarib.operator@barakah.local` | `/finance/applications` | `docs/evidence/uat/screenshots/UC-07-apply-capital.png` | Playwright route simulation with partial mutation note |
| UC-08 Perform financier due diligence | `investment.officer@mabrur.local` | `/finance/applications` | `docs/evidence/uat/screenshots/UC-08-due-diligence.png` | Playwright route simulation |
| UC-09 Perform Shariah/compliance review | `shariah.reviewer@hidayah.local` | `/finance/applications` | `docs/evidence/uat/screenshots/UC-09-shariah-review.png` | Playwright route simulation |
| UC-10 Execute contract/disbursement | `disbursement.officer@mabrur.local` | `/finance/contracts` | `docs/evidence/uat/screenshots/UC-10-contract-disburse.png` | Playwright route simulation |
| UC-11 Monitor procurement execution | `investment.officer@mabrur.local` | `/finance/ledgers` | `docs/evidence/uat/screenshots/UC-11-monitor-execution.png` | Playwright route simulation |
| UC-12 Calculate profit/loss and close | `supplier.finance@barakah.local` | `/finance/profit-loss` | `docs/evidence/uat/screenshots/UC-12-profit-loss-close.png` | Playwright route simulation |
| UC-13 Use network canvas | `procurement.officer@amanah.local` | `/graph/projects` | `docs/evidence/uat/screenshots/UC-13-network-canvas.png` | Playwright route simulation |
| UC-14 Verify audit/evidence pack | `auditor.user@raudah.local` | `/evidence/hashes` | `docs/evidence/uat/screenshots/UC-14-audit-evidence.png` | Playwright route simulation; real Fabric proof gated |
| UC-15 Integrate ERP/accounting | `erp.integrator@nusantara.local` | `/integrations` | `docs/evidence/uat/screenshots/UC-15-erp-integration.png` | Playwright route simulation |
| UC-16 Verify release/update local node | `buyer.admin@amanah.local` | `/operations` | `docs/evidence/uat/screenshots/UC-16-update-local-node.png` | Documentation/operations-backed partial |
| UC-17 Import network/channel package | `platform.admin@mepn.local` | `/fabric-governance` | `docs/evidence/uat/screenshots/UC-17-channel-join-package.png` | Governance/readiness-backed; no topology mutation |
| UC-18 Check node/channel compatibility | `fabric.operator@mepn.local` | `/fabric-governance` plus `GET /api/v1/node/status` | `docs/evidence/uat/screenshots/UC-18-node-compatibility.png` | Route simulation plus node-status API probe; topology mutation remains unsupported |

## Latest Local Result

2026-06-07 local run:

```text
corepack pnpm test:e2e -- tests/e2e/use-case-specification-uat.spec.ts
18 passed
```

Notes:

- `tests/e2e/setup-e2e.mjs` reused the already-running local infrastructure on
  ports 5432, 6379, and 9000 instead of trying to start duplicate containers.
- The command applied all Prisma migrations to `mepn_e2e`, seeded the UAT node
  accounts/data, and captured all UC-01 through UC-18 screenshots.
- Route screenshots are stored under `docs/evidence/uat/screenshots/`.

2026-06-07 follow-up blocker retest:

```text
corepack pnpm --dir apps/api test:unit -- node-status
3 passed

corepack pnpm --dir apps/api test:integration -- node-status
1 passed

corepack pnpm test:e2e -- tests/e2e/use-case-specification-uat.spec.ts
18 passed
```

Notes:

- UAT-B-007 is resolved for local UAT by `GET /api/v1/node/status`.
- UC-18 now verifies the node-status API response in addition to rendering the
  Fabric governance readiness page.
- The endpoint reports `topologyMutationSupported=false`; it does not implement
  direct channel creation, channel join, MSP onboarding, or admin secret custody.

2026-06-07 authentication blocker retest:

```text
corepack pnpm --dir apps/api test:integration -- auth
15 passed

corepack pnpm test:e2e -- tests/e2e/09-auth-flow.spec.ts
3 passed
```

Notes:

- UAT-B-002 is resolved for local UAT by `/api/v1/auth/password-login`.
- Seeded local/demo accounts use the account list in
  `docs/evidence/uat/seeded-node-accounts.txt`.
- Password login remains local/demo scoped and does not replace production OIDC
  hardening.
