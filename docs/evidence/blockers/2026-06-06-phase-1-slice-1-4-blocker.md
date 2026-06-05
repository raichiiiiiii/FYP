# Blocker: Phase 1 Slice 1.4 Azure VM Fabric Deployment Evidence

## Phase

Phase 1 - P0 Azure VM Fabric Gateway Deployment Evidence

## Slice

Slice 1.4 - Run or prepare GitHub Actions deployment

## Feature

Run Azure VM Fabric Gateway deployment and capture sanitized deployment
evidence.

## Command Attempted

```bash
git push origin main
gh workflow run deploy-azure-vm.yml --ref main
gh run watch 27024510947 --exit-status
gh run view 27024510947 --log-failed
```

Workflow run:

```text
https://github.com/raichiiiiiii/FYP/actions/runs/27024510947
```

## Sanitized Error Output

The workflow reached the VM and completed these steps:

```text
git reset --hard origin/main
Fabric Gateway secret files were written to /run/secrets/fabric without printing secret contents.
Fabric secret validation passed for /run/secrets/fabric; file contents were not printed.
Image mepn-frontend Built
Image mepn-worker Built
Image mepn-api Built
```

The deployment then failed during Docker Compose startup:

```text
Container mepn_api Stopping
Container 67f5c6a8597d_mepn_api Recreate
Error response from daemon: Error when allocating new name: Conflict.
The container name "/mepn_api" is already in use by container
"67f5c6a8597ddea7526609b577dc74e8ea2ab9d00a09cd14956819803a3ad6f2".
You have to remove (or rename) that container to be able to reuse that name.
Process exited with status 1
```

No PEM blocks, private keys, generated env contents, tokens, passwords, or VM
credentials were printed.

## Blocker Type

Deployment/runtime blocker.

The VM has a stale or conflicting Docker container name for `mepn_api`. The
repository workflow and secret validation path executed far enough to prove
secret materialization and validation, but the deployment cannot complete until
the container conflict is resolved.

## Implemented Work

- Pushed current `main` to `origin/main`.
- Triggered `deploy-azure-vm.yml`.
- Confirmed GitHub Actions secret injection was masked in logs.
- Confirmed `/run/secrets/fabric` materialization ran on the VM.
- Confirmed `scripts/validate-fabric-secrets.sh /run/secrets/fabric` passed.
- Confirmed frontend/API/worker images built on the VM.

## Remaining Work

- Resolve the stale/conflicting `mepn_api` container on the VM.
- Re-run the deploy workflow.
- Confirm `docker compose up -d` completes.
- Run Fabric Gateway smoke checks.
- Fill `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md` with sanitized live
  output.
- Update roadmap Slice 1.4 and Slice 1.5 status.

## Exact Resume Steps

1. SSH into the VM or use a safe deployment workflow step to inspect:

   ```bash
   cd /opt/mepn
   docker ps -a --filter name=mepn_api
   docker compose \
     -f docker-compose.prod.yml \
     --env-file .env.production \
     --env-file /run/secrets/fabric/env.generated \
     ps
   ```

2. Resolve the stale container conflict. Preferred safe options:

   ```bash
   docker compose \
     -f docker-compose.prod.yml \
     --env-file .env.production \
     --env-file /run/secrets/fabric/env.generated \
     down --remove-orphans
   ```

   or, if Compose still cannot remove the conflicting API container:

   ```bash
   docker rm -f mepn_api
   ```

3. Re-run the GitHub Actions workflow:

   ```bash
   gh workflow run deploy-azure-vm.yml --ref main
   gh run watch <new-run-id> --exit-status
   ```

4. After deployment succeeds, collect evidence:

   ```bash
   cd /opt/mepn
   OUTPUT_FILE=docs/evidence/deployment/latest-vm-deployment-evidence.txt \
     bash scripts/evidence/collect-vm-deployment-evidence.sh
   ```

5. Commit the updated evidence and roadmap status.

## Whether Code Was Committed

Yes. Prior safe slices were committed before this deployment attempt:

- `90a69b7 docs(roadmap): reconcile soon-to-be repository state`
- `35cdfe1 docs(roadmap): add phased implementation slices`
- `a309bc8 docs(roadmap): add soon-to-be implementation tracker`
- `d6776e2 chore(deploy): verify fabric gateway secret mapping`
- `d0f6b0d chore(deploy): harden fabric secret validation`
- `bdb8844 chore(evidence): sanitize vm deployment evidence collection`

This blocker note is safe to commit.

## Whether Evidence Is Safe To Commit

Yes. This blocker note contains only sanitized status, command names, a GitHub
Actions run id, and a Docker container conflict message. It does not contain
secret values.

## Resolution

Resolved on 2026-06-06.

Follow-up inspection over SSH showed no remaining `mepn_api` container name
conflict, and the deployment workflow was re-run successfully:

```bash
gh workflow run deploy-azure-vm.yml --ref main
gh run watch 27043095990 --exit-status
```

Successful workflow run:

```text
https://github.com/raichiiiiiii/FYP/actions/runs/27043095990
```

Sanitized VM evidence was collected with:

```bash
cd /opt/mepn
OUTPUT_FILE=/tmp/mepn-vm-deployment-evidence.txt \
  bash scripts/evidence/collect-vm-deployment-evidence.sh
```

Evidence file committed in the repository:

```text
docs/evidence/deployment/latest-vm-deployment-evidence.txt
```

Resolved outcome:

- `docker compose ps` shows API, frontend, reverse proxy, worker, PostgreSQL,
  Redis, and MinIO running.
- API, frontend, reverse proxy, PostgreSQL, and Redis health checks are healthy.
- Public `curl -I http://20.244.24.76/` returns `200 OK`.
- Public `/api/v1/health` returns `status=ok`, `database=ok`, and `redis=ok`.
- Public `/api/v1/integrations/fabric/status` reports Gateway mode configured
  with no missing Gateway config.
- `/api/v1/ready` is not currently implemented and returned `404`; this was
  recorded as non-critical evidence, not hidden.
- Hash-record Fabric verification evidence was skipped because no live
  Gateway-anchored hash record id was provided for this deployment evidence run.
- No PEM blocks, private keys, generated env contents, tokens, passwords, or VM
  credentials were committed.
