# Azure Student VM Deployment Guide

## Status
Completed prototype deployment runbook.

This guide documents how to deploy the MEPN FYP prototype to a single Azure for
Students Linux VM. It is suitable for prototype, staging, supervisor demo, and
UAT environments. It is not a production-grade deployment because API, web, and
worker processes are still run directly on the VM rather than through a full
container or reverse-proxy topology.

## Purpose
Use this document to:

- Create or verify the Azure student VM environment.
- Deploy the current `main` branch to the VM.
- Start PostgreSQL, Redis, MinIO, API, web, and worker processes.
- Verify the deployment from the VM and from a browser.
- Seed repeatable UAT/demo data.
- Back up and restart the prototype safely.
- Hand the environment to another developer or reviewer without relying on
  undocumented terminal history.

## Source Control Rule
The VM is a runtime environment only. The repository is the source of truth.

Recommended deployment flow:

1. Make changes locally.
2. Commit and push to `main`.
3. SSH into the VM.
4. Pull `main`.
5. Install dependencies, apply migrations, build, and restart processes.

Record the deployed commit during each handover:

```bash
git rev-parse --short HEAD
git rev-parse HEAD
```

Initial deployment baseline:

```text
commit: ef279c8c963f2760918612b461fa0dad9146e515
tag:    mepn-skeletal-workflow-prototype
note:   Initial skeletal workflow prototype baseline
```

## Azure Resource Inventory
Keep all FYP resources in one Azure resource group so cost and cleanup are easy.

| Item | Recommended / current value | Handover note |
| --- | --- | --- |
| Azure offer | Azure for Students | Confirm remaining credit before demos. |
| Resource group | `rg-mepn-fyp` | Keep all FYP resources here. |
| VM name | `vm-mepn-fyp` | Main prototype VM. |
| Region | Central India | Used because the student policy allowed it during the first deployment. |
| OS image | Canonical Ubuntu Server 24.04 LTS | Use the official Canonical image, not a paid third-party image. |
| SSH user | `azureuser` | SSH key login only. Do not commit keys. |
| VM size | B1ms minimum, B2s preferred for demos | Confirm exact size in Azure Portal before handover. |
| OS disk | Standard SSD, 30 GiB minimum | Increase only if logs/backups need more space. |
| Public IP | Azure-assigned public IP or DNS label | Record in private handover notes, not in public docs. |
| Budget alert | Low student-credit threshold | Recommended alerts at 50%, 75%, and 90% of available credit. |

## Runtime Architecture
The current prototype uses one Azure VM.

```text
Browser
  -> Azure VM public endpoint
  -> Vite web app on port 5173
  -> NestJS API on port 3000
  -> PostgreSQL container on localhost:5432
  -> Redis container on localhost:6379
  -> MinIO container on localhost:9000/9001
  -> Worker process polling outbox events
```

Current runtime shape:

| Component | Runtime | Port | Public access |
| --- | --- | ---: | --- |
| Web | Vite build served by `vite preview` or temporary Vite dev server | 5173 | Temporarily yes |
| API | NestJS compiled app or dev server | 3000 | Temporarily yes |
| Worker | NestJS worker process | none | No |
| PostgreSQL | Docker Compose container | 5432 | No |
| Redis | Docker Compose container | 6379 | No |
| MinIO API | Docker Compose container | 9000 | No |
| MinIO console | Docker Compose container | 9001 | No |

Prototype limitations:

- There is no reverse proxy yet.
- HTTPS is not configured unless a domain/reverse proxy is added later.
- `infra/docker-compose.yml` currently starts infrastructure services only.
- API, web, and worker are started from the repository with `tmux`.
- Public ports `3000` and `5173` are temporary for student demo use.

## Repository Files
Deployment-related repository files:

```text
.env.example
.env.production.example
infra/docker-compose.yml
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
apps/api
apps/web
apps/worker
tests/uat/seed-uat-demo.mjs
docs/deployment/azure-student-vm-deployment.md
```

Runtime-only VM files:

```text
.env.production
backups/
*.pem
```

These files must not be committed. `.gitignore` is configured to ignore them.

## Azure VM Network Rules
Use this inbound access while the app is still a prototype:

| Layer | Allow |
| --- | --- |
| Azure NSG | `22`, temporary `3000`, temporary `5173` |
| Ubuntu UFW | `OpenSSH`, temporary `3000/tcp`, temporary `5173/tcp` |

Keep these ports closed to the public internet:

```text
5432  PostgreSQL
6379  Redis
9000  MinIO API
9001  MinIO console
```

When a reverse proxy is added, only `22`, `80`, and `443` should remain open,
and the temporary public `3000` and `5173` rules should be removed.

## Create The VM
Create the VM through Azure Portal or Azure CLI with these choices:

- Subscription: Azure for Students.
- Resource group: `rg-mepn-fyp`.
- Region: use a region allowed by the student policy.
- Image: Canonical Ubuntu Server 24.04 LTS.
- Authentication: SSH public key.
- Inbound ports: SSH only at creation time.
- Disk: Standard SSD is enough for the prototype.

After creation, add temporary inbound rules for:

```text
3000/tcp
5173/tcp
```

These are required only because the prototype does not yet have a reverse proxy.

## Bootstrap Ubuntu
SSH into the VM:

```bash
ssh -i /path/to/vm-mepn-fyp-key.pem azureuser@YOUR_VM_PUBLIC_ENDPOINT
```

Update packages:

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

Install base tools:

```bash
sudo apt-get install -y git curl ca-certificates gnupg build-essential tmux ufw
```

Install Docker:

```bash
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and SSH back in so the Docker group membership is active. Then verify:

```bash
docker --version
docker compose version
```

Install Node.js LTS and pnpm through Corepack:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable
corepack prepare pnpm@9.0.0 --activate
node --version
pnpm --version
```

Enable the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw allow 5173/tcp
sudo ufw enable
sudo ufw status
```

## Clone Or Update The Repository
First-time clone:

```bash
cd ~
git clone https://github.com/raichiiiiiii/FYP.git
cd ~/FYP
git checkout main
```

Update an existing VM checkout:

```bash
cd ~/FYP
git fetch origin
git checkout main
git pull --ff-only origin main
```

If the VM has local uncommitted edits, stop and inspect them before pulling:

```bash
git status --short
```

Do not resolve VM drift by committing directly on the VM unless there is a clear
operational reason.

## Configure Environment
Create the VM-local production env file:

```bash
cd ~/FYP
cp .env.production.example .env.production
nano .env.production
```

Replace:

```text
YOUR_VM_PUBLIC_ENDPOINT
change_me
```

For the current infrastructure compose file, PostgreSQL and MinIO demo
credentials match the values in `infra/docker-compose.yml`. If those compose
credentials are changed later, update `.env.production` at the same time.

Load environment variables for the current shell:

```bash
set -a
source .env.production
set +a
```

## Start Infrastructure
Start PostgreSQL, Redis, and MinIO:

```bash
docker compose \
  --env-file .env.production \
  -f infra/docker-compose.yml \
  up -d
```

Verify containers:

```bash
docker ps
```

Expected containers:

```text
mepn-postgres
mepn-redis
mepn-minio
```

## Install, Generate, Migrate, And Build
Install dependencies:

```bash
pnpm install
```

Generate Prisma client:

```bash
pnpm prisma:generate
```

Apply migrations:

```bash
pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma
```

Build API, worker, and web:

```bash
pnpm --dir apps/api build
pnpm --dir apps/worker build
pnpm --dir apps/web build
```

Use `prisma db push` only as an emergency prototype fallback when migrations are
not available:

```bash
pnpm --dir apps/api exec prisma db push --schema prisma/schema.prisma
```

Do not use `db push` as the normal deployment path once migrations exist.

## Start Processes With tmux
Stop old sessions if they exist:

```bash
tmux kill-session -t mepn-api 2>/dev/null || true
tmux kill-session -t mepn-web 2>/dev/null || true
tmux kill-session -t mepn-worker 2>/dev/null || true
```

Start API:

```bash
tmux new -d -s mepn-api \
  'cd ~/FYP && set -a && source .env.production && set +a && pnpm --dir apps/api start:prod'
```

Start web in prototype preview mode:

```bash
tmux new -d -s mepn-web \
  'cd ~/FYP && set -a && source .env.production && set +a && pnpm --dir apps/web preview --host 0.0.0.0 --port 5173'
```

Start worker:

```bash
tmux new -d -s mepn-worker \
  'cd ~/FYP && set -a && source .env.production && set +a && pnpm --dir apps/worker start:prod'
```

If a build artifact is missing or the demo needs hot reload, the temporary
development commands are:

```bash
tmux new -d -s mepn-api 'cd ~/FYP && set -a && source .env.production && set +a && pnpm dev:api'
tmux new -d -s mepn-web 'cd ~/FYP && set -a && source .env.production && set +a && pnpm --dir apps/web dev --host 0.0.0.0 --port 5173'
tmux new -d -s mepn-worker 'cd ~/FYP && set -a && source .env.production && set +a && pnpm dev:worker'
```

Check sessions:

```bash
tmux ls
```

Attach to a session:

```bash
tmux attach -t mepn-api
```

Detach without stopping it:

```text
Ctrl+B, then D
```

## Verification Checklist
Run on the VM:

```bash
docker ps
tmux ls
curl http://localhost:3000/api/v1/health
curl -I http://localhost:5173
ss -tlnp | grep -E '3000|5173'
```

Expected API health shape:

```json
{
  "status": "ok",
  "service": "mepn-api",
  "database": "ok",
  "redis": "ok",
  "environment": "production"
}
```

Browser checks from a laptop:

```text
http://YOUR_VM_PUBLIC_ENDPOINT:5173
http://YOUR_VM_PUBLIC_ENDPOINT:3000/api/v1/health
```

Minimum UI checks:

- `/dashboard` shows API, database, and Redis status.
- `/org/setup` can create or show organization context.
- `/procurement/requisitions` opens without console errors.
- `/evidence/packs` can show seeded evidence packs.
- `/audit/search` loads audit filters.
- `/finance/applications` loads the finance workspace.
- `/integrations` shows outbox/integration status for allowed roles.

## Seed Demo Or UAT Data
After the API is running:

```bash
pnpm seed:uat
```

For a remote or non-default API URL:

```bash
UAT_API_BASE_URL=http://YOUR_VM_PUBLIC_ENDPOINT:3000/api/v1 pnpm seed:uat
```

Save the JSON output in private UAT handover evidence. It contains:

- Organization ID.
- Role user IDs.
- Procurement records.
- Evidence pack.
- Finance application.
- Closure pack.
- Integration outbox request.
- Suggested reviewer start URLs.

## Update Deployment After A New Main Commit
On the VM:

```bash
cd ~/FYP
git fetch origin
git checkout main
git pull --ff-only origin main
pnpm install
pnpm prisma:generate
pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --dir apps/api build
pnpm --dir apps/worker build
pnpm --dir apps/web build
```

Restart tmux sessions:

```bash
tmux kill-session -t mepn-api 2>/dev/null || true
tmux kill-session -t mepn-web 2>/dev/null || true
tmux kill-session -t mepn-worker 2>/dev/null || true

tmux new -d -s mepn-api \
  'cd ~/FYP && set -a && source .env.production && set +a && pnpm --dir apps/api start:prod'
tmux new -d -s mepn-web \
  'cd ~/FYP && set -a && source .env.production && set +a && pnpm --dir apps/web preview --host 0.0.0.0 --port 5173'
tmux new -d -s mepn-worker \
  'cd ~/FYP && set -a && source .env.production && set +a && pnpm --dir apps/worker start:prod'
```

Re-run the verification checklist.

## Backup And Restore
Create a local backup folder:

```bash
mkdir -p ~/FYP/backups
```

Back up PostgreSQL:

```bash
docker exec -e PGPASSWORD=mepn mepn-postgres \
  pg_dump -U mepn -d mepn > ~/FYP/backups/mepn-$(date +%Y%m%d-%H%M%S).sql
```

List backups:

```bash
ls -lh ~/FYP/backups
```

Restore to the current database only when you intentionally want to replace its
contents:

```bash
cat ~/FYP/backups/YOUR_BACKUP_FILE.sql | \
  docker exec -i -e PGPASSWORD=mepn mepn-postgres \
  psql -U mepn -d mepn
```

MinIO object data currently lives in the Docker volume
`mepn-minio-data`. For prototype handover, preserve the VM and Docker volumes.
For stronger backup coverage, copy MinIO data or move object storage to a managed
S3-compatible service later.

## Cost Control
Azure for Students credit is limited. When the VM is not needed:

1. Open Azure Portal.
2. Go to `vm-mepn-fyp`.
3. Select `Stop`.
4. Confirm the VM state becomes `Stopped (deallocated)`.

Do not rely only on `sudo shutdown now` inside Ubuntu. A stopped-but-allocated VM
can still consume compute credit.

Recommended cost checks:

- Add budget alerts at 50%, 75%, and 90% of available student credit.
- Deallocate the VM after demos.
- Avoid premium disks unless required.
- Keep all resources in `rg-mepn-fyp` for easy cleanup.
- Delete unused public IPs, disks, snapshots, and test VMs.

## Security Rules
Never commit:

- `.env.production`
- Private SSH keys
- Real public IP handover sheets
- Database passwords
- MinIO credentials
- OIDC secrets
- JWT/session secrets
- Backup files

Prototype safety rules:

- Use SSH key authentication.
- Keep Postgres, Redis, and MinIO ports private.
- Use temporary public `3000` and `5173` only for demos.
- Rotate demo credentials if a screenshot or handover note exposes them.
- Prefer private handover notes for IP addresses and credentials.

## Troubleshooting

### Azure region policy blocks VM creation

Symptom:

```text
RequestDisallowedByAzure
Allowed resource deployment regions
```

Fix:

Use a region allowed by the Azure for Students policy. Central India worked for
the initial deployment.

### Marketplace eligibility fails

Symptom:

```text
MarketplacePurchaseEligibilityFailed
PublisherId: cloud-infrastructure-services
```

Fix:

Use the official Canonical Ubuntu Server image.

### SSH connection times out

Check from Windows:

```powershell
Test-NetConnection YOUR_VM_PUBLIC_ENDPOINT -Port 22
```

Fix:

- Confirm the VM is running.
- Confirm Azure NSG allows SSH.
- Confirm local network allows outbound SSH.
- Confirm the public IP or DNS label is correct.

### Windows private key permissions are too open

Symptom:

```text
UNPROTECTED PRIVATE KEY FILE
bad permissions
```

Fix:

Move the key into the Windows user `.ssh` directory and restrict access, or use
`icacls` to remove broad permissions.

### pnpm is unavailable

Fix:

```bash
sudo corepack enable
corepack prepare pnpm@9.0.0 --activate
```

Fallback:

```bash
sudo npm install -g pnpm@9.0.0
```

### Browser cannot access the web app

Check:

```bash
curl -I http://localhost:5173
ss -tlnp | grep 5173
```

Fix:

Start the web process with `--host 0.0.0.0`:

```bash
pnpm --dir apps/web preview --host 0.0.0.0 --port 5173
```

Also confirm Azure NSG and UFW allow `5173/tcp`.

### API health is degraded

Check containers and env:

```bash
docker ps
printenv DATABASE_URL
printenv REDIS_URL
curl http://localhost:3000/api/v1/health
```

Fix:

- Restart infrastructure with Docker Compose.
- Confirm `.env.production` was sourced before starting API/worker.
- Confirm Prisma migrations were applied.

### Worker is not processing outbox events

Check:

```bash
tmux attach -t mepn-worker
```

Confirm `.env.production` has:

```env
WORKER_POLL_ENABLED=true
WORKER_POLL_INTERVAL_MS=5000
WORKER_MAX_ATTEMPTS=5
```

Restart the worker after env changes.

## Future Hardening Backlog
These improvements are not required for the current student VM prototype, but
they are the next steps toward a production-style deployment:

- Add Dockerfiles for API, web, and worker.
- Add `docker-compose.prod.yml` for full single-VM deployment.
- Add Nginx or Caddy reverse proxy.
- Serve web through `80`/`443`.
- Route API through `/api/v1` behind the reverse proxy.
- Remove public access to `3000` and `5173`.
- Enable HTTPS with a real domain.
- Move secrets to GitHub Actions Secrets, Azure Key Vault, or another secret
  store.
- Add GitHub Actions CI and deployment workflow.
- Add automated backup and restore scripts.
- Add health checks and structured logging.
- Add rollback instructions for previous release directories or images.

## Handover Checklist
Before handover, record these items in private project notes:

| Item | Completed |
| --- | --- |
| Azure resource group confirmed | |
| VM size and disk type confirmed | |
| Public IP or DNS label recorded privately | |
| Current deployed commit recorded | |
| `.env.production` exists on VM | |
| Docker containers are running | |
| API, web, and worker tmux sessions are running | |
| API health endpoint returns `ok` | |
| Browser can open the web app | |
| UAT/demo seed command was run if needed | |
| Latest backup file created | |
| Budget alerts are configured | |
| VM deallocation rule explained | |

## Final State Summary
At the end of this deployment path:

```text
Azure VM is reachable by SSH.
Docker and Docker Compose are installed.
PostgreSQL, Redis, and MinIO run through Docker Compose.
API runs on port 3000.
Web runs on port 5173.
Worker runs without public exposure.
API health confirms database and Redis connectivity.
Frontend can call the API through VITE_API_BASE_URL.
UAT/demo data can be seeded repeatably.
The setup is adequate for FYP prototype demos and UAT, with hardening clearly
listed for future production work.
```
