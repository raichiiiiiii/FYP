# Azure Student VM Deployment Guide

## 1. Purpose

This document explains how to deploy the MEPN MVP to an Azure Student VM using
Docker Compose.

This deployment is intended for:

- academic demonstration
- MVP validation
- self-hosted SME-node demonstration
- UI/UX testing
- integration smoke testing

It is not a high-availability regulated production deployment.

## Current Deployment Status

Manual Azure Student VM deployment has been executed successfully for the MEPN
MVP Docker Compose stack.

Recorded readiness:

- `docker-compose.prod.yml` configuration validates with
  `.env.production.example`.
- Local `corepack pnpm verify` passed before committing this deployment report.
- Production images were built from application code at commit `95844ae`; the
  VM repository was later synced to the latest `main` documentation state.
- GitHub Actions CI and Azure VM deployment workflows exist.
- Latest manual deployment verification: `2026-06-03 07:14 UTC`.
- Latest deployed commit: `95844ae` (`fix: use ipv4 compose health checks`).
- Verified public endpoint: `http://20.244.24.76/`.
- Live VM deployment path: `/opt/mepn`.
- Live VM Docker restart was performed, then the stack was restored with
  `docker compose -f docker-compose.prod.yml --env-file .env.production up -d`.
- Live VM `docker compose ps` showed the reverse proxy, frontend, API,
  PostgreSQL, Redis, and MinIO healthy; the worker was running.
- Live VM `curl -I http://localhost/` returned `HTTP/1.1 200 OK`.
- Live VM `curl http://localhost/api/v1/health` returned `status: ok`,
  `database: ok`, and `redis: ok`.
- Public HTTP `curl -I http://PUBLIC_IP/` returned `HTTP/1.1 200 OK`.
- Public HTTP `curl -I http://PUBLIC_IP/dashboard` returned `HTTP/1.1 200 OK`.
- Public `curl http://PUBLIC_IP/api/v1/health` returned `status: ok`,
  `database: ok`, and `redis: ok`.
- Public `/dashboard` returned the React app through the reverse proxy.

Public port verification for the current prototype:

| Port | Status | Purpose |
| --- | --- | --- |
| `22` | Open | SSH administration |
| `80` | Open | HTTP reverse proxy |
| `443` | Closed | HTTPS not configured yet |
| `3000` | Closed | API is internal behind reverse proxy |
| `5173` | Closed | Vite dev server is not public |
| `5432` | Closed | PostgreSQL is internal |
| `6379` | Closed | Redis is internal |
| `9000` | Closed | MinIO API is internal |
| `9001` | Closed | MinIO console is internal |

Deployment-specific fixes applied during this run:

- API production entrypoint was corrected to start `dist/src/main`.
- Docker Compose health checks were changed to use `127.0.0.1` instead of
  `localhost`, avoiding IPv6 localhost resolution issues inside Alpine
  containers.
- Old host-level development servers on ports `3000` and `5173` were stopped;
  production traffic now goes through the reverse proxy on port `80`.

Current deployment notes:

- HTTPS is not configured yet, so public port `443` is intentionally closed.
- The worker container is running, but it does not yet have a Docker health
  check. During the Docker restart window, worker logs showed one transient
  Prisma transaction timeout (`P2028`). The final container inspection showed
  the worker running with `RestartCount=0`; monitor this in future deployments
  and add a worker health check/retry hardening when the outbox worker is made
  production-grade.
- Phase 13 local closeout validation on `2026-06-04 08:26 +09:00` confirmed
  Docker Desktop was available, production Compose config rendered with
  `.env.production.example`, and `docker compose -f docker-compose.prod.yml
  --env-file .env.production.example build` built the frontend, API, and worker
  images successfully.
- Phase 13 did not run a fresh Azure VM redeploy. Use the update and smoke-test
  commands below before claiming the VM is running the latest local commit.

Do not commit `.env.production`, SSH keys, or private deployment notes.

## 2. Target Architecture

```text
Browser
  -> Azure public IP or domain
  -> Nginx reverse proxy
  -> Frontend container
  -> Backend API container
  -> Worker container
  -> PostgreSQL
  -> Redis
  -> MinIO object storage
  -> optional Fabric adapter mock or external Fabric endpoint
```

Current repository deployment files:

```text
.env.production.example
docker-compose.prod.yml
deploy/frontend.Dockerfile
deploy/api.Dockerfile
deploy/worker.Dockerfile
deploy/nginx/nginx.conf
deploy/nginx/frontend.conf
```

## 3. Recommended VM Settings

Recommended VM:

- OS: Ubuntu LTS, preferably Ubuntu Server 24.04 LTS
- Authentication: SSH public key
- Size: B1ms minimum, B2s preferred for demos
- OS disk: Standard SSD, 30 GiB minimum
- Inbound ports:
  - `22` for SSH
  - `80` for HTTP
  - `443` for HTTPS if TLS will be enabled

Do not expose PostgreSQL, Redis, MinIO, or the API port directly to the public
internet.

## 4. Create VM

1. Sign in to Azure Portal.
2. Create a new Linux virtual machine.
3. Select an Ubuntu LTS image.
4. Use SSH public key authentication.
5. Allow selected inbound ports:
   - SSH `22`
   - HTTP `80`
6. After creation, add HTTPS `443` to the VM network security group if TLS will
   be enabled.
7. Copy the public IP address.

Placeholder values used in this guide:

```text
YOUR_PUBLIC_IP
YOUR_DOMAIN
YOUR_REPO_URL
~/Downloads/mepn-vm-key.pem
```

## 5. SSH Into VM

From your local machine:

```bash
chmod 400 ~/Downloads/mepn-vm-key.pem
ssh -i ~/Downloads/mepn-vm-key.pem azureuser@YOUR_PUBLIC_IP
```

## 6. Update OS

On the VM:

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

Reconnect after reboot:

```bash
ssh -i ~/Downloads/mepn-vm-key.pem azureuser@YOUR_PUBLIC_IP
```

## 7. Install Required Packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nano ufw
```

Optional firewall setup:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Only enable `443/tcp` if HTTPS will be configured.

## 8. Install Docker Engine and Compose Plugin

```bash
sudo apt update
sudo apt install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update

sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verify Docker:

```bash
sudo systemctl status docker
sudo docker run hello-world
docker compose version
```

Optional Docker group setup:

```bash
sudo usermod -aG docker $USER
newgrp docker
docker run hello-world
```

If the Docker group is not applied immediately, log out and SSH back in.

## 9. Clone Repository

```bash
sudo mkdir -p /opt/mepn
sudo chown -R $USER:$USER /opt/mepn

cd /opt/mepn

git clone YOUR_REPO_URL .
```

Confirm the repository contains the deployment files:

```bash
ls
ls deploy
ls deploy/nginx
```

## 10. Configure Production Environment

```bash
cd /opt/mepn
cp .env.production.example .env.production
nano .env.production
```

Never commit `.env.production`.

At minimum, replace placeholder values:

```text
APP_URL
API_URL
WEB_ORIGIN
POSTGRES_PASSWORD
DATABASE_URL
JWT_SECRET
SESSION_SECRET
OBJECT_STORAGE_ACCESS_KEY
OBJECT_STORAGE_SECRET_KEY
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
FABRIC_ENABLED
FABRIC_MODE
```

For a public-IP-only prototype, use:

```env
APP_URL=http://YOUR_PUBLIC_IP
API_URL=http://YOUR_PUBLIC_IP/api
WEB_ORIGIN=http://YOUR_PUBLIC_IP
VITE_API_BASE_URL=/api/v1
```

For a domain-based prototype, use:

```env
APP_URL=https://YOUR_DOMAIN
API_URL=https://YOUR_DOMAIN/api
WEB_ORIGIN=https://YOUR_DOMAIN
VITE_API_BASE_URL=/api/v1
```

Ensure the database password in `DATABASE_URL` matches `POSTGRES_PASSWORD`.

Example pattern:

```env
POSTGRES_DB=mepn
POSTGRES_USER=mepn
POSTGRES_PASSWORD=change_me_to_a_long_random_value
DATABASE_URL=postgresql://mepn:change_me_to_a_long_random_value@postgres:5432/mepn
```

Fabric remains mock-backed by default:

```env
FABRIC_ENABLED=false
FABRIC_MODE=mock
```

For real Fabric Gateway mode, set `FABRIC_ENABLED=true` and
`FABRIC_MODE=gateway`, then provide the Gateway URL, MSP ID, channel,
chaincode, peer endpoint, host alias, TLS certificate path, identity certificate
path, private key path, and submit/commit timeouts. Do not commit Fabric
identity material. Mount certificate/key files through a private VM path or a
future secret-management mechanism.

### Fabric Gateway Secret Mount

For local development, the production Compose file mounts this repository path:

```text
deploy/fabric/
```

into the API and worker containers as:

```text
/run/secrets/fabric
```

For deployed Azure VM Gateway mode, the GitHub Actions deployment workflow
materializes Fabric material directly under:

```text
/run/secrets/fabric/
```

and sets `FABRIC_SECRET_MOUNT=/run/secrets/fabric` through the generated env
file. Runtime certificate and key files must never be committed or printed in
logs.

Expected VM runtime files:

```text
/run/secrets/fabric/
  identity/
    cert.pem
    key.pem
  tls/
    ca.crt
  connection-profile.json
  env.generated
```

Recommended generated env values for those mounted files:

```env
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
FABRIC_ENABLED=true
FABRIC_MODE=gateway
FABRIC_SECRET_MOUNT=/run/secrets/fabric
FABRIC_IDENTITY_CERT_PATH=/run/secrets/fabric/identity/cert.pem
FABRIC_PRIVATE_KEY_PATH=/run/secrets/fabric/identity/key.pem
FABRIC_TLS_CERT_PATH=/run/secrets/fabric/tls/ca.crt
```

Also set:

```env
FABRIC_GATEWAY_URL=grpcs://YOUR_FABRIC_GATEWAY:7051
FABRIC_MSP_ID=YOUR_MSP_ID
FABRIC_CHANNEL=YOUR_CHANNEL
FABRIC_CHAINCODE=YOUR_CHAINCODE
FABRIC_PEER_ENDPOINT=YOUR_PEER_ENDPOINT
FABRIC_GATEWAY_HOST_ALIAS=YOUR_PEER_HOST_ALIAS
```

Current limitation: Gateway mode is configuration-guarded and the worker has a
real Fabric Gateway adapter. API-side verification now requires a successful
`ReadAnchor` chaincode query before reporting `verified=true`. If Gateway mode
is misconfigured, Fabric anchor requests and verification must fail clearly
instead of producing mock success.

### Optional Fabric Gateway Integration Workflow

The manual workflow below runs the gated worker integration test against a real
Fabric Gateway target. It is intentionally separate from normal CI.

```text
.github/workflows/fabric-gateway-integration.yml
```

Required GitHub repository secrets:

| Secret | Meaning |
| --- | --- |
| `FABRIC_GATEWAY_URL` | Reachable Gateway URL for the peer/gateway target |
| `FABRIC_MSP_ID` | MSP ID for the submitted identity |
| `FABRIC_CHANNEL` | Channel containing the audit anchor chaincode |
| `FABRIC_CHAINCODE` | Chaincode name, for example `audit-anchor` |
| `FABRIC_PEER_ENDPOINT` | Peer endpoint used by the Gateway client |
| `FABRIC_GATEWAY_HOST_ALIAS` | TLS host alias for the Gateway connection |
| `FABRIC_IDENTITY_CERT_PEM` | Client identity certificate body |
| `FABRIC_PRIVATE_KEY_PEM` | Client private key body |
| `FABRIC_TLS_CERT_PEM` | Peer/Gateway TLS CA certificate body |

Optional GitHub Actions variables:

| Variable | Default |
| --- | --- |
| `FABRIC_SUBMIT_TIMEOUT_MS` | `30000` |
| `FABRIC_COMMIT_TIMEOUT_MS` | `30000` |

Trigger the workflow manually from GitHub Actions and type:

```text
run-real-fabric
```

The workflow writes certificate/key material only to the runner temporary
directory and does not upload Fabric material as an artifact. The Fabric Gateway
must be reachable from the GitHub-hosted runner; otherwise use a self-hosted
runner, VPN, or run the local gated integration test from the operator machine.

## 11. Validate Compose Configuration

```bash
cd /opt/mepn
docker compose -f docker-compose.prod.yml --env-file .env.production config
```

If this command fails, fix `.env.production` or `docker-compose.prod.yml`
before building.

## 12. Build and Start

```bash
cd /opt/mepn
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

The API container runs Prisma migrations before starting the NestJS API.

## 13. Check Containers

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100
```

Expected services:

```text
mepn_reverse_proxy
mepn_frontend
mepn_api
mepn_worker
mepn_postgres
mepn_redis
mepn_minio
```

## 14. Smoke Test

From the VM:

```bash
curl -I http://localhost
curl http://localhost/api/v1/health
```

From your local machine or browser:

```bash
curl -I http://YOUR_PUBLIC_IP
```

Expected successful frontend result:

```text
HTTP/1.1 200 OK
```

Expected API health response includes:

```json
{
  "status": "ok",
  "service": "mepn-api",
  "database": "ok",
  "redis": "ok"
}
```

Open the app:

```text
http://YOUR_PUBLIC_IP/
```

If using a domain:

```text
https://YOUR_DOMAIN/
```

## 15. Update Deployment

To deploy the latest `main` branch:

```bash
cd /opt/mepn
git fetch origin
git checkout main
git pull origin main

docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Record the deployed commit:

```bash
git rev-parse --short HEAD
git rev-parse HEAD
```

## 16. Rollback

```bash
cd /opt/mepn

git log --oneline -5
git checkout PREVIOUS_COMMIT_SHA

docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

After rollback, smoke test again:

```bash
curl -I http://localhost
curl http://localhost/api/v1/health
```

Return to `main` when ready:

```bash
git checkout main
```

## 17. Logs and Troubleshooting

View all logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=200
```

View one service:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f frontend
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f worker
```

Restart one service:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart frontend
docker compose -f docker-compose.prod.yml --env-file .env.production restart api
docker compose -f docker-compose.prod.yml --env-file .env.production restart worker
```

Restart all services:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart
```

Stop all services:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

Stop and remove containers without deleting persistent volumes:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

Stop and remove containers plus volumes:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

Use `down -v` only when you intentionally want to delete PostgreSQL, Redis, and
MinIO data.

## 18. Common Issues

### Docker Permission Denied

Use `sudo` or add the user to the Docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Port 80 Already In Use

Find the process:

```bash
sudo ss -tulpn | grep ':80'
```

Stop the conflicting service or change the published port in
`docker-compose.prod.yml`.

### API Health Fails

Check API, database, and Redis logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api postgres redis
```

Confirm:

- `DATABASE_URL` points to `postgres`, not `localhost`.
- `REDIS_URL` points to `redis`, not `localhost`.
- `POSTGRES_PASSWORD` matches the password inside `DATABASE_URL`.
- Prisma migrations completed in the API logs.

### Frontend Cannot Call API

Confirm the frontend was built with:

```env
VITE_API_BASE_URL=/api/v1
```

Then rebuild:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend reverse-proxy
```

### VM Is Not Reachable From Browser

Confirm Azure NSG and UFW allow `80/tcp`:

```bash
sudo ufw status
```

Also confirm the reverse proxy is running:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps reverse-proxy
```

## 19. Backups

Create a backup directory:

```bash
mkdir -p /opt/mepn/backups
```

Back up PostgreSQL:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  pg_dump -U mepn mepn > /opt/mepn/backups/mepn-$(date +%Y%m%d-%H%M%S).sql
```

Back up object storage volume through Docker volume backup if required by the
demo or UAT plan.

## 20. Known Limitations

This Azure Student VM deployment is not a regulated production deployment.

Limitations:

- single VM
- no high availability
- no managed database
- local container volumes unless migrated to managed services
- limited disaster recovery
- HTTPS is not configured unless a domain and TLS certificate are added
- Fabric may be mocked or externally integrated depending on environment
- no production-grade secret manager unless added separately
- no automated blue-green or canary release process
- not suitable for real financial customer data without security, legal,
  Shariah, privacy, and regulatory review

## 21. GitHub Actions Deployment

After the manual Docker Compose deployment has succeeded once, deployment can be
triggered from GitHub Actions.

The workflow file is:

```text
.github/workflows/deploy-azure-vm.yml
```

Required repository secrets:

```text
AZURE_VM_HOST
AZURE_VM_USER
AZURE_VM_SSH_KEY
FABRIC_CHAINCODE
FABRIC_CHANNEL
FABRIC_GATEWAY_HOST_ALIAS
FABRIC_GATEWAY_URL
FABRIC_IDENTITY_CERT_PEM
FABRIC_MSP_ID
FABRIC_PEER_ENDPOINT
FABRIC_PRIVATE_KEY_PEM
FABRIC_TLS_CERT_PEM
```

Set them in:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions -> Repository secrets
```

Secret meaning:

| Secret | Meaning |
| --- | --- |
| `AZURE_VM_HOST` | VM public IP address or DNS name |
| `AZURE_VM_USER` | SSH username, for example `azureuser` |
| `AZURE_VM_SSH_KEY` | Private SSH key with access to the VM |
| `FABRIC_CHAINCODE` | Deployed audit anchor chaincode name |
| `FABRIC_CHANNEL` | Channel containing the audit anchor chaincode |
| `FABRIC_GATEWAY_HOST_ALIAS` | TLS host alias for the Gateway connection |
| `FABRIC_GATEWAY_URL` | Gateway URL used by Fabric Gateway clients |
| `FABRIC_IDENTITY_CERT_PEM` | Client identity certificate body |
| `FABRIC_MSP_ID` | MSP ID for the Gateway identity |
| `FABRIC_PEER_ENDPOINT` | Peer endpoint used by the Gateway client |
| `FABRIC_PRIVATE_KEY_PEM` | Client private key body |
| `FABRIC_TLS_CERT_PEM` | Peer/Gateway TLS CA certificate body |

Do not store `.env.production` in GitHub secrets for this workflow. The runtime
environment file must already exist on the VM at:

```text
/opt/mepn/.env.production
```

The workflow connects over SSH and runs:

```bash
cd /opt/mepn
git fetch origin main
git reset --hard origin/main
bash scripts/deploy/write-fabric-secrets-on-vm.sh
bash scripts/validate-fabric-secrets.sh /run/secrets/fabric
docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  --env-file /run/secrets/fabric/env.generated build
docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  --env-file /run/secrets/fabric/env.generated up -d
docker compose -f docker-compose.prod.yml \
  --env-file .env.production \
  --env-file /run/secrets/fabric/env.generated ps
APP_BASE_URL=http://localhost bash scripts/smoke/fabric-gateway-smoke.sh
```

Trigger options:

- automatically on push to `main`
- manually from GitHub Actions using `Run workflow`

Manual trigger:

1. Open the GitHub repository.
2. Go to `Actions`.
3. Select `Deploy to Azure VM`.
4. Click `Run workflow`.
5. Select the branch to deploy.
6. Confirm the run.

The workflow must not print `.env.production`, PEM values, private keys, or
generated secret file contents. Review the workflow logs after each deployment
and confirm only sanitized validation, smoke-test output, and Docker Compose
status are shown.

To rotate Fabric Gateway material:

1. Update the Fabric-related GitHub repository secrets listed above.
2. Run the `Deploy to Azure VM` workflow manually.
3. Confirm `scripts/validate-fabric-secrets.sh` passes in the workflow log.
4. Confirm `scripts/smoke/fabric-gateway-smoke.sh` reports Gateway mode and no
   mock verification claim.

To collect reviewer-safe VM evidence after deployment:

```bash
cd /opt/mepn
OUTPUT_FILE=docs/evidence/deployment/latest-vm-deployment-evidence.txt \
  bash scripts/evidence/collect-vm-deployment-evidence.sh
```

The evidence script redacts PEM blocks, tokens, passwords, and private-key
markers before writing the output file.

## 22. Handover Checklist

Before handover, record these items in private project notes:

| Item | Completed |
| --- | --- |
| Azure resource group confirmed | |
| VM public IP or domain recorded privately | |
| SSH access verified | |
| Docker and Compose installed | |
| Repository cloned to `/opt/mepn` | |
| `.env.production` created and not committed | |
| `docker compose config` passes | |
| Containers build successfully | |
| Containers are running | |
| `curl http://localhost/api/v1/health` returns `ok` | |
| Browser can open the app | |
| Latest deployed commit recorded | |
| Rollback command tested or documented | |
| Known limitations explained to reviewer | |
