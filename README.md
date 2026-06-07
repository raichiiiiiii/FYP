# MEPN

MEPN is a Mudarabah-Enabled Procurement Network. It is a self-hostable
procurement-finance MVP for SME procurement workflows and restricted mudarabah
financing review.

The current implementation is an academic MVP/prototype. It demonstrates the
main workflow surfaces and selected backend integrations, but it is not a
regulated production financial system.

## Product Overview

MEPN connects procurement evidence with mudarabah financing workflows.

Core idea:

```text
Procurement records
  -> evidence and audit trail
  -> revenue-generating opportunity
  -> mudarabah application
  -> financier and Shariah review
  -> ledger, profit/loss, and closure evidence
```

Current reviewable areas:

- role-aware application shell and navigation
- local/dev authentication flow
- dashboard and smart task inbox
- organization setup
- procurement requisition and approval foundation
- finance opportunities and application workspace
- ledger and profit/loss display with no guaranteed fixed return
- audit timeline and Fabric anchor status display
- network canvas fixture/read-model view
- integrations and operations status surfaces
- Docker Compose deployment files for Azure Student VM

## Source Of Truth

Follow the source-of-truth order defined in [AGENTS.md](AGENTS.md):

1. [SRS](docs/requirements/mudarabah_eprocurement_srs.tex)
2. [SDD](docs/design/mepn_software_design_description.tex)
3. [UI flow contract](docs/ui/mepn-ui-contract-flow.md)
4. [UI flow contract appendix](docs/ui/mepn-ui-contract-flow-appendix.md)
5. [Figma to UI contract map](docs/ui/figma-to-ui-contract-map.md)
6. [Figma Make reference](docs/design/figma-make-reference/)
7. Existing production code

The Figma Make export is a visual and interaction reference only. It must not
override SRS, SDD, UI contract, authorization rules, workflow state machines,
audit behavior, ledger calculations, or deployment behavior.

## Technology Stack

The implementation stack is accepted through
[ADR-011](docs/adr/ADR-011-implementation-stack.md).

- Frontend: React + TypeScript + Vite
- Backend/API: NestJS + TypeScript
- Worker: separate NestJS/Node worker application
- Database: PostgreSQL
- ORM/migrations: Prisma
- Queue/cache/locks: Redis
- Object storage: MinIO locally, S3-compatible later
- Auth: local/dev auth first, OAuth/OIDC later
- Deployment: Docker Compose
- API style: REST + OpenAPI direction
- Package manager: pnpm workspace

## Repository Structure

```text
apps/
  web/      React + TypeScript + Vite frontend
  api/      NestJS REST API
  worker/   Background worker for outbox and integration jobs
packages/
  shared/   Shared DTOs, constants, enums, and validation schemas
  config/   Shared environment/config utilities
infra/
  docker-compose.yml for local PostgreSQL, Redis, and MinIO
deploy/
  Dockerfiles and nginx config for VM deployment
docs/
  requirements, design, UI contract, testing, deployment, ADRs
```

## Run Locally

Prerequisites:

- Node.js 22 or compatible LTS
- Corepack
- Docker Desktop or Docker Engine

Install dependencies:

```bash
corepack enable
corepack pnpm install
```

Start local infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Start the apps:

```bash
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:worker
```

Useful URLs:

```text
Web:          http://localhost:5173
Dashboard:    http://localhost:5173/dashboard
API health:   http://localhost:3000/api/v1/health
MinIO API:    http://localhost:9000
MinIO console:http://localhost:9001
```

The frontend currently uses a local/dev session flow. Real OAuth/OIDC remains a
future integration behind configuration.

## Local Self-Hosted Node Setup

MEPN is distributed for the MVP as a self-hostable organization node. Each local
deployment owns its PostgreSQL database, evidence/object storage, configuration,
and secrets. Fabric participation is optional proof infrastructure; Fabric stores
hash/proof anchors only and is not the operational business database.

Prerequisites:

- Node.js 22 or compatible LTS
- Corepack
- Docker Desktop or Docker Engine
- Git

Install and start local infrastructure:

```bash
corepack enable
corepack pnpm install
docker compose -f infra/docker-compose.yml up -d
```

Apply database migrations and seed the local/UAT organization-node accounts:

```bash
corepack pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma
corepack pnpm seed:uat
```

Start the application services in separate terminals:

```bash
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:worker
```

Local URLs:

```text
Web:          http://localhost:5173
API health:   http://localhost:3000/api/v1/health
MinIO API:    http://localhost:9000
MinIO console:http://localhost:9001
```

Seeded local/demo password:

```text
mepn-demo-password
```

The seed stores only `passwordHash`. Current local authentication is still the
configured dev/OIDC-style login boundary, so use the local login options exposed
by the app for demo access. Change or disable seeded accounts before any
non-demo use.

Seeded node accounts:

```text
platform.admin@mepn.local
fabric.operator@mepn.local
support.operator@mepn.local
buyer.admin@amanah.local
procurement.officer@amanah.local
approver.manager@amanah.local
finance.accountant@amanah.local
receiving.officer@amanah.local
supplier.admin@barakah.local
supplier.sales@barakah.local
mudarib.operator@barakah.local
supplier.finance@barakah.local
financier.admin@mabrur.local
investment.officer@mabrur.local
disbursement.officer@mabrur.local
risk.reviewer@mabrur.local
shariah.admin@hidayah.local
shariah.reviewer@hidayah.local
compliance.reviewer@hidayah.local
auditor.admin@raudah.local
auditor.user@raudah.local
regulator.user@raudah.local
integrator.admin@nusantara.local
erp.integrator@nusantara.local
api.integrator@nusantara.local
```

Run the SRS use-case UAT simulation:

```bash
corepack pnpm test:e2e -- tests/e2e/use-case-specification-uat.spec.ts
```

Screenshot output:

```text
docs/evidence/uat/screenshots/
```

UAT reports:

```text
docs/evidence/uat/USE_CASE_BLOCKERS.md
docs/evidence/uat/USE_CASE_SIMULATION_RESULTS.md
```

Reset local infrastructure data:

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
corepack pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma
corepack pnpm seed:uat
```

## Verify Locally

Run:

```bash
corepack pnpm verify
```

This runs:

- lint
- frontend typecheck
- unit/component tests
- frontend/API/worker builds

Latest recorded local verification is documented in
[test-report-template.md](docs/testing/test-report-template.md).

## Deploy To Azure Student VM

Manual deployment guide:

- [Azure Student VM Deployment Guide](docs/deployment/azure-student-vm-deployment.md)

Production-style compose files:

```text
.env.production.example
docker-compose.prod.yml
deploy/frontend.Dockerfile
deploy/api.Dockerfile
deploy/worker.Dockerfile
deploy/nginx/nginx.conf
deploy/nginx/frontend.conf
```

Do not commit `.env.production`.

After the first successful manual deployment, GitHub Actions deployment can be
enabled through:

- [.github/workflows/deploy-azure-vm.yml](.github/workflows/deploy-azure-vm.yml)

Required GitHub secrets:

```text
AZURE_VM_HOST
AZURE_VM_USER
AZURE_VM_SSH_KEY
```

## Demo

Use the review script:

- [MEPN Demo Script](docs/demo-script.md)

The intended demo path is:

1. Dashboard
2. Procurement
3. Finance opportunity
4. Mudarabah application workspace
5. Ledger and profit/loss
6. Audit and Fabric verification states
7. Network canvas
8. Integrations and operations status

## Testing And Review Artifacts

- [Testing strategy](docs/testing/testing-strategy.md)
- [Latest test report template/results](docs/testing/test-report-template.md)
- [UAT readiness](docs/testing/uat-readiness.md)
- [Skeletal/current UI walkthrough](docs/ui/skeletal-web-ui-workflow.md)
- [Implementation plan](docs/implementation-plan.md)

## Known Limitations

- This is an MVP/prototype, not a production financial deployment.
- Some frontend views use typed fixtures or local state where backend contracts
  are still incomplete.
- Fabric anchoring is represented through honest status states; real Fabric
  Gateway integration is not complete.
- Payment, e-signature, ERP, and finance provider integrations are adapter/mock
  oriented unless explicitly configured later.
- Local/dev auth exists; production OAuth/OIDC is not fully integrated.
- Azure Student VM deployment is single-node and not high availability.
- Real financial customer data requires security, legal, Shariah, privacy, and
  regulatory review before use.
