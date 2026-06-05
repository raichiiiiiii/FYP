# VM Deployment Evidence

## Purpose

This document records sanitized deployment evidence for the Azure Student VM
Docker Compose deployment.

## Target

- VM host or domain:
- Branch:
- Commit:
- Timestamp:
- Operator:

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
| `docker compose ps` shows frontend/API/worker/postgres/redis/minio running | Pending VM run | Requires running the deploy workflow or VM command manually. |
| Frontend responds to `curl -I /` | Pending VM run | |
| API health responds at `/api/v1/health` | Pending VM run | |
| API readiness responds at `/api/v1/ready` if available | Pending VM run | |
| Fabric integration status responds | Pending VM run | |
| Hash-record Fabric verification responds if seeded id is provided | Pending live Gateway hash record | |
| Logs show no crash loop | Pending VM run | |
| Evidence output is sanitized | Pending VM run | |

## Sanitized Output

Paste or link the generated sanitized evidence file here after review:

```text
Pending.
```

## Fabric Gateway Status

- Mode:
- Channel:
- Chaincode:
- MSP ID:
- Real Gateway proof hash record id:
- Verification status:

## Known Limitations

- The Azure Student VM deployment is not high availability.
- Secret material is currently materialized onto the VM under
  `/run/secrets/fabric` for the FYP demo deployment.
- Do not paste PEM blocks, private keys, tokens, or `.env.production` contents
  into this document.

## Reviewer Conclusion

Pending.
