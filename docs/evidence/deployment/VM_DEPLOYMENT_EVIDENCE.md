# VM Deployment Evidence

## Purpose

This document records sanitized deployment evidence for the Azure Student VM
Docker Compose deployment.

## Target

- VM host or domain: `20.244.24.76`
- Branch: `main`
- Last GitHub Actions deployment commit: `b1610189802b21d71f08630ba26c2d33ce51714c`
- App runtime commit during VM-local Fabric proof: `4266b3d`
- Timestamp: `2026-06-06T00:18Z`
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
| VM-local Fabric prerequisites | Passed | Docker, Docker Compose, Git, Bash, curl, jq, Go, Fabric samples, binaries, and images are present on the VM. |
| VM-local Fabric runtime | Passed | Fabric CA, peer, orderer, and `audit-anchor` chaincode containers are running on Docker network `fabric_test`. |
| Fabric channel and chaincode | Passed | Channel `mepn-audit` exists and chaincode `audit-anchor` is committed. |
| VM-local Fabric secret export | Passed | `/run/secrets/fabric` was regenerated from the VM-local Fabric network and validated without printing contents. |
| Worker peer reachability | Passed | `mepn_worker` can resolve and reach `peer0.org1.example.com:7051` after joining `fabric_test`. |
| Hash-record Fabric verification responds if seeded id is provided | Passed | Hash record `34c5a7e7-5bf3-4246-89ae-b51a2e765ef4` returned `verified=true`, status `verified`, transaction id present, and block number `6`. |
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
- Runtime: VM-local Hyperledger Fabric test network for FYP/UAT proof
- Channel: `mepn-audit`
- Chaincode: `audit-anchor`
- MSP ID: `Org1MSP`
- Peer endpoint from worker container: `peer0.org1.example.com:7051`
- Gateway URL: `grpcs://peer0.org1.example.com:7051`
- Real Gateway proof hash record id: `34c5a7e7-5bf3-4246-89ae-b51a2e765ef4`
- Verification status: `verified=true`, `status=verified`
- Transaction id:
  `1b92ddeb54734197ae5cf5e9e0d0cf5ab45d81cd809a5b80301bf06485be20c7`
- Block number: `6`

Screenshot evidence:

```text
docs/evidence/uat/fabric-gateway-hash-record-verification.png
docs/evidence/uat/fabric-gateway-proof-panel.png
```

## Known Limitations

- The Azure Student VM deployment is not high availability.
- Secret material is currently materialized onto the VM under
  `/run/secrets/fabric` for the FYP demo deployment.
- `/api/v1/ready` is not currently implemented.
- This deployment evidence proves one VM-local FYP/UAT hash-record
  `ReadAnchor` proof. It does not claim regulated production consortium
  readiness.
- Do not paste PEM blocks, private keys, tokens, or `.env.production` contents
  into this document.

## Reviewer Conclusion

The Azure Student VM deployment is reachable on port 80. The API, database,
Redis, worker, object storage, reverse proxy, and VM-local Fabric runtime are
running. A real worker Gateway anchor was submitted to `audit-anchor`, API-side
`ReadAnchor` returned the matching on-chain hash, and reviewer-facing
screenshots were captured without mock labels.
