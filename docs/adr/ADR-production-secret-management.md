# ADR: Production Secret Management For Current FYP Deployment

## Status

Accepted for FYP demo deployment

## Context

The current MEPN deployment target is an Azure Student VM running Docker Compose.
The project needs repeatable evidence that Fabric Gateway material can be
delivered without committing or logging certificate/key contents.

Available GitHub repository secrets:

- `AZURE_VM_HOST`
- `AZURE_VM_SSH_KEY`
- `AZURE_VM_USER`
- `FABRIC_CHAINCODE`
- `FABRIC_CHANNEL`
- `FABRIC_GATEWAY_HOST_ALIAS`
- `FABRIC_GATEWAY_URL`
- `FABRIC_IDENTITY_CERT_PEM`
- `FABRIC_MSP_ID`
- `FABRIC_PEER_ENDPOINT`
- `FABRIC_PRIVATE_KEY_PEM`
- `FABRIC_TLS_CERT_PEM`

## Decision

For the current FYP demo deployment:

1. GitHub repository secrets are the source for VM deployment secrets.
2. The deployment workflow writes Fabric Gateway material on the VM under:

   ```text
   /run/secrets/fabric/
     identity/cert.pem
     identity/key.pem
     tls/ca.crt
     connection-profile.json
     env.generated
   ```

3. Docker Compose mounts the Fabric secret directory read-only into API and
   worker containers at `/run/secrets/fabric`.
4. Secret contents are not committed, printed, echoed, or uploaded as artifacts.
5. Validation scripts check existence, JSON validity, non-empty files, and
   private-key permissions without printing file contents.

## Consequences

- This is sufficient for repeatable FYP/demo deployment evidence.
- It is not a final enterprise secret-management architecture.
- A managed secret store, stronger workload identity, and formal certificate
  rotation process remain future production-hardening work.
- Normal CI remains mock-safe and does not require Fabric secrets.
