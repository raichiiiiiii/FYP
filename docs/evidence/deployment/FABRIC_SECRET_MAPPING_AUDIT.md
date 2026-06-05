# Fabric Gateway Secret Mapping Audit

## Purpose

This document records the repository-side audit for Azure VM Fabric Gateway
secret delivery. It is safe to commit because it contains only secret names,
paths, commands, and validation notes. It does not contain secret values.

## Audit Date

2026-06-06

## Scope

Reviewed files:

- `.github/workflows/deploy-azure-vm.yml`
- `.github/workflows/fabric-gateway-integration.yml`
- `scripts/deploy/write-fabric-secrets-on-vm.sh`
- `scripts/validate-fabric-secrets.sh`
- `scripts/smoke/fabric-gateway-smoke.sh`
- `scripts/evidence/collect-vm-deployment-evidence.sh`
- `docker-compose.prod.yml`
- `.env.production.example`
- `docs/deployment/azure-student-vm-deployment.md`

## Repository Secrets

The deployment workflow consumes the existing configured secret names:

| Secret | Usage |
|---|---|
| `AZURE_VM_HOST` | SSH target host. |
| `AZURE_VM_USER` | SSH username. |
| `AZURE_VM_SSH_KEY` | SSH private key passed to the SSH action. |
| `FABRIC_CHAINCODE` | Fabric chaincode name written to generated runtime env. |
| `FABRIC_CHANNEL` | Fabric channel written to generated runtime env. |
| `FABRIC_GATEWAY_HOST_ALIAS` | TLS host alias for Gateway connection profile and env. |
| `FABRIC_GATEWAY_URL` | Gateway URL for API/worker clients. |
| `FABRIC_IDENTITY_CERT_PEM` | Written to `/run/secrets/fabric/identity/cert.pem`. |
| `FABRIC_MSP_ID` | MSP ID written to connection profile and env. |
| `FABRIC_PEER_ENDPOINT` | Peer endpoint written to connection profile and env. |
| `FABRIC_PRIVATE_KEY_PEM` | Written to `/run/secrets/fabric/identity/key.pem`. |
| `FABRIC_TLS_CERT_PEM` | Written to `/run/secrets/fabric/tls/ca.crt`. |

No additional secret names are required for the current VM deployment path.

## Secret File Layout

The deploy script materializes files on the VM under:

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

The API and worker containers mount the Fabric directory read-only:

```text
/run/secrets/fabric:/run/secrets/fabric:ro
```

## Safety Checks

| Check | Result | Notes |
|---|---|---|
| Workflow uses exact configured secret names | Passed | `deploy-azure-vm.yml` references only the listed Azure/Fabric repository secrets. |
| Deploy script avoids `set -x` | Passed | Scripts use `set -euo pipefail`; no traced secret commands. |
| PEM/private key values are not printed | Passed | Secret values are written with `printf` redirection and not echoed to stdout. |
| Private key file permissions restricted | Passed | Deploy script installs `key.pem` with mode `600`; validator rejects world-readable key files where supported. |
| Connection profile validates as JSON | Passed | `scripts/validate-fabric-secrets.sh` runs `python3 -m json.tool`. |
| Required runtime env keys validated | Passed | Validator checks Gateway mode, channel, chaincode, MSP, endpoint, host alias, and cert/key/TLS paths. |
| Compose mount is read-only | Passed | API and worker use `:ro` mounts for `/run/secrets/fabric`. |
| Smoke output is sanitized | Passed | Smoke script redacts PEM/private-key/token/password patterns. |

## Validation Commands

```bash
bash -n scripts/deploy/write-fabric-secrets-on-vm.sh
bash -n scripts/validate-fabric-secrets.sh
bash -n scripts/smoke/fabric-gateway-smoke.sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
```

## Current Limitations

- This audit proves repository secret mapping and script safety only.
- It does not prove the Azure VM is currently reachable.
- It does not prove the configured Fabric Gateway material is valid.
- Live deployment evidence must be captured separately in
  `docs/evidence/deployment/VM_DEPLOYMENT_EVIDENCE.md`.

