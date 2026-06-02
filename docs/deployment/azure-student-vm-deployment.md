# Azure Student VM Deployment Notes

> Status: Draft template for the Azure VM deployment created during the FYP deployment spike. This document records what is currently known and lists TODOs for local development to convert the manual VM setup into a repeatable deployment.

## 1. Purpose

This document explains the current Azure for Students VM deployment used to run the MEPN FYP prototype. It is intended for future developers who need to understand what was deployed, how it was started, what is temporary, and what still needs to be formalized in the repository.

This is not yet a full production deployment guide. The current deployment is a working student-budget VM deployment used for demonstration and validation.

## 2. Source control baseline

Initial VM deployment was performed from this repository baseline:

```text
commit: ef279c8c963f2760918612b461fa0dad9146e515
short:  ef279c8
tag:    mepn-skeletal-workflow-prototype
branch: main
note:   Freeze skeletal workflow prototype baseline
```

The VM should be treated as a runtime environment, not as the source of truth. Future changes should be made on a local development branch, reviewed through a pull request, merged into `main`, and then pulled or deployed onto the VM.

## 3. Azure resource inventory

Fill in or verify the values below from the Azure Portal before each handover.

| Item | Current value / expected value | Notes |
|---|---|---|
| Azure offer | Azure for Students | Student-credit subscription. Keep cost controls active. |
| Resource group | `rg-mepn-fyp` | All FYP Azure resources should stay in this group. |
| VM name | `vm-mepn-fyp` | Main Ubuntu VM used for the demo deployment. |
| Region | Central India | Chosen because the student subscription policy allowed it. |
| OS image | Canonical Ubuntu Server 24.04 LTS | Avoid third-party paid Marketplace Ubuntu images. |
| SSH user | `azureuser` | SSH key-based login. Do not commit private keys. |
| Public IP | Retrieve from Azure Portal | Do not hard-code live public IPs in public documentation. |
| DNS label | Retrieve from Azure Portal | Optional Azure DNS label under `*.cloudapp.azure.com`. |
| VM size | TODO: document exact size | Record the final size used for the demo, for example B1s/B1ms/B2s. |
| OS disk | TODO: document exact disk type and size | Record disk type, size, and expected cost implication. |
| Budget | TODO: confirm monthly budget alert | Recommended: low monthly alert threshold for student credit safety. |

## 4. Current deployment architecture

The current working deployment is a single Azure Linux VM with Docker Compose for infrastructure services and `tmux` sessions for application processes.

```text
Browser
  -> Azure VM public endpoint
  -> Vite web dev server on port 5173
  -> NestJS API on port 3000
  -> PostgreSQL container
  -> Redis container
  -> MinIO container
  -> Worker process in tmux
```

Current services:

| Component | Current runtime | Port | Notes |
|---|---|---:|---|
| Web frontend | `pnpm --dir apps/web dev --host 0.0.0.0 --port 5173` in `tmux` | `5173` | Temporary demo setup. Must bind to `0.0.0.0` for external access. |
| API | `pnpm dev:api` in `tmux` | `3000` | Health endpoint verified at `/api/v1/health`. |
| Worker | `pnpm dev:worker` in `tmux` | N/A | Runs background workflow jobs. |
| PostgreSQL | Docker Compose service | `5432` on VM | Should not be exposed publicly through Azure NSG. |
| Redis | Docker Compose service | `6379` on VM | Should not be exposed publicly through Azure NSG. |
| MinIO | Docker Compose service | `9000`, `9001` on VM | Should not be exposed publicly without protection. |

Known temporary limitations:

- The web app is currently served by the Vite dev server, not a production static build.
- API, web, and worker are started using `tmux`, not systemd, PM2, or containers.
- Ports `3000` and `5173` are temporarily opened for demo access.
- There is no reverse proxy yet.
- HTTPS is not configured yet.
- The production deployment file `docker-compose.prod.yml` does not exist yet.
- The current `infra/docker-compose.yml` only starts infrastructure services, not API/web/worker containers.

## 5. Repository files involved

Current known files:

```text
.env.example
infra/docker-compose.yml
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
apps/api
apps/web
apps/worker
```

Runtime-only files on the VM:

```text
.env.production
backups/
```

These runtime-only files must not be committed.

Required ignore rules:

```gitignore
.env.production
backups/
*.pem
```

TODO: verify these rules already exist in `.gitignore`; add them if missing.

## 6. Environment configuration

The VM uses a server-local `.env.production` file derived from `.env.example`. This file contains runtime-specific configuration and must remain on the VM only.

Example shape only; do not paste real secrets into the repository:

```env
NODE_ENV=production

API_PORT=3000
WEB_PORT=5173
WEB_ORIGIN=http://YOUR_VM_PUBLIC_ENDPOINT:5173
VITE_API_BASE_URL=http://YOUR_VM_PUBLIC_ENDPOINT:3000/api/v1

DATABASE_URL=postgresql://mepn:mepn@localhost:5432/mepn
REDIS_URL=redis://localhost:6379

WORKER_POLL_ENABLED=true
WORKER_POLL_INTERVAL_MS=5000
WORKER_MAX_ATTEMPTS=5

MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=mepn
MINIO_SECRET_KEY=change_me
MINIO_BUCKET=mepn-evidence

OIDC_ISSUER_URL=http://localhost:8080/realms/mepn
OIDC_CLIENT_ID=mepn-web
OIDC_CLIENT_SECRET=change_me
```

TODO: create and commit a sanitized `.env.production.example` after the final deployment topology is settled.

## 7. Manual deployment and restart procedure

SSH into the VM:

```bash
ssh -i /path/to/vm-mepn-fyp-key.pem azureuser@YOUR_VM_PUBLIC_ENDPOINT
```

Go to the repository:

```bash
cd ~/FYP
```

Start infrastructure services:

```bash
docker compose \
  --env-file .env.production \
  -f infra/docker-compose.yml \
  up -d
```

Install or refresh dependencies:

```bash
sudo corepack enable || sudo npm install -g pnpm@9.0.0
pnpm -v
pnpm install
```

Load environment variables for one shell session:

```bash
set -a
source .env.production
set +a
```

Generate Prisma client:

```bash
pnpm prisma:generate
```

Apply database schema:

```bash
pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma
```

If migrations are not available yet, use this temporary development fallback only:

```bash
pnpm --dir apps/api exec prisma db push --schema prisma/schema.prisma
```

Start API, web, and worker in `tmux`:

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

Detach without stopping the process:

```text
Ctrl+B, then D
```

## 8. Verification checklist

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

TODO: after reverse proxy is implemented, replace this with:

```text
http://YOUR_VM_PUBLIC_ENDPOINT/
http://YOUR_VM_PUBLIC_ENDPOINT/api/v1/health
```

## 9. Network and firewall notes

Current temporary inbound rules:

| Layer | Ports |
|---|---|
| Azure NSG | `22`, `80`, `443`, temporary `3000`, temporary `5173` |
| Ubuntu UFW | `OpenSSH`, `80`, `443`, temporary `3000/tcp`, temporary `5173/tcp` |

Do not publicly open these ports:

```text
5432  PostgreSQL
6379  Redis
9000  MinIO API
9001  MinIO console
```

TODO: replace temporary public `3000` and `5173` access with a reverse proxy on `80`/`443` only.

## 10. Backup notes

Basic PostgreSQL backup command used for demo protection:

```bash
mkdir -p ~/FYP/backups

docker exec -e PGPASSWORD=mepn mepn-postgres \
  pg_dump -U mepn -d mepn > ~/FYP/backups/mepn-$(date +%Y%m%d-%H%M%S).sql

ls -lh ~/FYP/backups
```

TODO: formalize backup scripts for:

- PostgreSQL dumps.
- MinIO object data.
- Restore testing.
- Secure off-VM backup copy.
- Backup retention policy.

## 11. Cost-control notes

The VM should be deallocated when not in active demo or development use.

Use Azure Portal:

```text
Virtual machine -> Stop -> confirm status is Stopped (deallocated)
```

Do not rely only on shutting down Ubuntu inside the VM. Confirm the Azure VM power state is `Stopped (deallocated)` in the portal.

TODO: document the exact Azure budget alert settings used for the student subscription.

## 12. Troubleshooting notes from initial deployment

### Region policy blocked VM creation

Symptom:

```text
RequestDisallowedByAzure
Allowed resource deployment regions
```

Resolution:

Use only a region allowed by the Azure for Students subscription policy. For this deployment, Central India was used.

### Marketplace purchase eligibility failed

Symptom:

```text
MarketplacePurchaseEligibilityFailed
PublisherId: cloud-infrastructure-services
OfferId: ubuntu-22-04
```

Resolution:

Use the official Canonical Ubuntu Server image, not a third-party paid Marketplace image.

### SSH connection timed out

Checks:

```powershell
Test-NetConnection YOUR_VM_PUBLIC_ENDPOINT -Port 22
```

Resolution:

Verify the VM is running, NSG inbound SSH rule exists, and the local network does not block outbound SSH.

### Windows private key permission error

Symptom:

```text
UNPROTECTED PRIVATE KEY FILE
bad permissions
```

Resolution:

Restrict the `.pem` file permissions with `icacls`, or move the key into the Windows user `.ssh` directory and restrict access.

### pnpm not found after Corepack

Symptom:

```text
EACCES: permission denied, symlink ... /usr/bin/pnpm
Command 'pnpm' not found
```

Resolution:

Use:

```bash
sudo corepack enable
corepack prepare pnpm@9.0.0 --activate
```

Fallback:

```bash
sudo npm install -g pnpm@9.0.0
```

### Browser cannot access web app but localhost works

Symptom:

```text
curl -I http://localhost:5173 -> 200 OK
ss shows 127.0.0.1:5173
browser shows ERR_CONNECTION_REFUSED
```

Resolution:

Restart the web process with:

```bash
pnpm --dir apps/web dev --host 0.0.0.0 --port 5173
```

## 13. TODO list for local development

Complete these from a local development machine, not directly from the VM unless there is a specific operational reason.

### Documentation TODO

- [ ] Confirm exact VM size, disk size, and OS image from Azure Portal.
- [ ] Add screenshots for VM overview, public IP, NSG rules, API health, frontend page, `docker ps`, and `tmux ls`.
- [ ] Add final public demo URL after reverse proxy is configured.
- [ ] Document budget alert threshold values.
- [ ] Document backup and restore test result.
- [ ] Update root `README.md` with a short deployment section linking to this document.

### Repository hygiene TODO

- [ ] Ensure `.env.production`, `backups/`, and `*.pem` are ignored.
- [ ] Add sanitized `.env.production.example`.
- [ ] Add a safe `start-mepn.sh` or equivalent local ops script.
- [ ] Avoid committing any real Azure, database, MinIO, OIDC, JWT, or SSH secrets.

### Deployment hardening TODO

- [ ] Replace `tmux`-based API/web/worker runtime with Docker Compose services or systemd units.
- [ ] Add production Dockerfiles for API, web, and worker if missing.
- [ ] Add `docker-compose.prod.yml` for the full single-VM topology.
- [ ] Build the frontend as static production assets instead of serving through Vite dev server.
- [ ] Add Nginx or Caddy reverse proxy.
- [ ] Route frontend through port `80`/`443`.
- [ ] Route API through `/api` or `/api/v1` behind the reverse proxy.
- [ ] Remove public Azure NSG access to temporary ports `3000` and `5173`.
- [ ] Ensure Postgres, Redis, and MinIO are not reachable from the public internet.
- [ ] Enable HTTPS when a domain is available.
- [ ] Move secrets to GitHub Actions Secrets, Azure Key Vault, or another proper secret store.

### CI/CD TODO

- [ ] Add GitHub Actions test workflow.
- [ ] Add deployment workflow that SSHes into the VM only after tests pass.
- [ ] Store VM host, user, and SSH key in GitHub Actions Secrets.
- [ ] Run Prisma migrations automatically during deploy.
- [ ] Add rollback notes or previous-release restart instructions.

### Operations TODO

- [ ] Add health checks for API, database, Redis, worker, and object storage.
- [ ] Add structured logs or minimum log inspection steps.
- [ ] Add disk usage checks.
- [ ] Add backup script and restore script.
- [ ] Test restoring a backup into a clean environment.
- [ ] Define when to deallocate the VM to protect Azure student credit.

## 14. Handover summary

Current state at the end of the initial deployment spike:

```text
Azure VM exists and is reachable by SSH.
Docker is installed.
PostgreSQL, Redis, and MinIO run through Docker Compose.
API runs in tmux on port 3000.
Web runs in tmux on port 5173 and must bind to 0.0.0.0.
Worker runs in tmux.
API health endpoint returns ok for API, database, and Redis.
Frontend is reachable through the VM public endpoint on port 5173.
Deployment is sufficient for an FYP V1 demo, but not yet production-grade.
```
