# VM Deployment Evidence

## Purpose

This document records sanitized deployment evidence for the Azure Student VM
Docker Compose deployment.

## Target

- VM host or domain: `20.244.24.76`
- Branch: `main`
- Commit: `b1610189802b21d71f08630ba26c2d33ce51714c`
- Timestamp: `2026-06-05T22:22:29Z`
- Operator: Codex via GitHub Actions and SSH evidence collection

## Evidence Collection Command

Run from `/opt/mepn` on the VM:

```bash
OUTPUT_FILE=docs/evidence/deployment/latest-vm-deployment-evidence.txt \
  bash scripts/evidence/collect-vm-deployment-evidence.sh
```

Optional real Fabric verification proof:

```bash
HASH_RECORD_ID=YOUR_HASH_RECORD_ID \
OUTPUT_FILE=docs/evidence/deployment/latest-vm-deployment-evidence.txt \
  bash scripts/evidence/collect-vm-deployment-evidence.sh
```

## Checklist

| Check | Result | Notes |
| --- | --- | --- |
| `docker compose -f docker-compose.prod.yml --env-file .env.production.example config` renders | Passed locally | Confirms API/worker read-only Fabric secret mounts and mock defaults render. |
| Fabric secret validation script parses | Passed locally | `bash -n` passed for deployment, validation, smoke, and evidence scripts. |
| Placeholder Fabric secret layout validates without printing contents | Passed locally | `scripts/validate-fabric-secrets.sh` passed against placeholder files under `/tmp`. |
| VM evidence collection dry-run | Passed locally | `DRY_RUN=true` wrote a sanitized command plan without contacting a VM. |
| GitHub Actions deploy workflow reached VM | Passed | Run `27043095990` completed successfully after the earlier `27024510947` Docker container conflict was resolved. See `docs/evidence/blockers/2026-06-06-phase-1-slice-1-4-blocker.md`. |
| `docker compose ps` shows frontend/API/worker/postgres/redis/minio running | Passed | `mepn_api`, `mepn_frontend`, `mepn_reverse_proxy`, `mepn_worker`, `mepn_postgres`, `mepn_redis`, and `mepn_minio` are running. |
| Frontend responds to `curl -I /` | Passed | VM-local and public checks return `200 OK`. |
| API health responds at `/api/v1/health` | Passed | Returns `status=ok`, `database=ok`, `redis=ok`, and `environment=production`. |
| API readiness responds at `/api/v1/ready` if available | Not implemented | Endpoint returned `404`; this is recorded as a non-critical readiness endpoint gap. |
| Fabric integration status responds | Passed | Returns Gateway mode configured, no missing Gateway config, and hash-only security-boundary messaging. |
| Hash-record Fabric verification responds if seeded id is provided | Skipped | `HASH_RECORD_ID` was not provided for this deployment evidence run. Real proof screenshots remain a separate P0 item. |
| Logs show no crash loop | Passed | API/frontend/reverse-proxy startup logs are present; compose status shows healthy API/frontend/reverse proxy/postgres/redis. |
| Evidence output is sanitized | Passed | Secret-pattern scan found no PEM blocks, private-key markers, configured secret env names, database URL assignments, JWT secret, session secret, or VM SSH key values. |

## Sanitized Output

Generated evidence file:

```text
docs/evidence/deployment/latest-vm-deployment-evidence.txt
```

Public smoke checks from outside the VM:

```text
curl -I http://20.244.24.76/
HTTP/1.1 200 OK

curl http://20.244.24.76/api/v1/health
{"status":"ok","service":"mepn-api","database":"ok","redis":"ok","environment":"production",...}

curl http://20.244.24.76/api/v1/integrations/fabric/status
{"enabled":true,"mode":"gateway","gatewayConfigured":true,"realGatewayAdapterImplemented":true,"missingGatewayConfig":[]...}
```

## Fabric Gateway Status

- Mode: Gateway
- Channel: Configured, value not printed
- Chaincode: Configured, value not printed
- MSP ID: Configured, value not printed
- Real Gateway proof hash record id: Not provided in this deployment evidence run
- Verification status: Gateway runtime configured; hash-record on-chain proof skipped
  until a live Gateway-anchored hash record id is supplied

## Known Limitations

- The Azure Student VM deployment is not high availability.
- Secret material is currently materialized onto the VM under
  `/run/secrets/fabric` for the FYP demo deployment.
- `/api/v1/ready` is not currently implemented.
- This deployment evidence proves Gateway configuration and service health, not
  a specific hash-record `ReadAnchor` proof. Real proof screenshots are tracked
  separately in the P0 Fabric proof screenshot phase.
- Do not paste PEM blocks, private keys, tokens, or `.env.production` contents
  into this document.

## Reviewer Conclusion

The Azure Student VM deployment workflow completed successfully and the public
application endpoint is reachable on port 80. The API, database, Redis, and
Fabric Gateway configuration health checks are passing. Real on-chain
hash-record proof still requires a live Gateway-anchored hash record id.
