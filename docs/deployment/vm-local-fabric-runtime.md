# VM-Local Fabric Runtime For FYP/UAT Proof

## Purpose

This runbook records the chosen resolution path for the Phase 2 Slice 2.2
Fabric proof blocker.

The current Azure VM deployment has the MEPN app stack running in Fabric Gateway
mode with mounted Fabric secret files. The missing piece is the actual Fabric
runtime. The worker exhausted its anchor attempts because it tried to reach
`127.0.0.1:7051` from inside the worker container and no peer was reachable
there.

For FYP/UAT proof, MEPN will use a VM-local Hyperledger Fabric test network
unless an external reachable Fabric peer endpoint and matching credentials are
explicitly provided.

## Decision

Use a VM-local Fabric test network for reviewer proof.

This decision is scoped to demo/UAT evidence:

- It is acceptable for FYP reviewer proof.
- It is not a regulated production consortium topology.
- It must still use real Fabric Gateway submission and chaincode `ReadAnchor`.
- It must not be replaced with mock anchoring.
- It must not report `verified=true` unless the API successfully queries
  chaincode and compares the on-chain hash with the local canonical hash.

Future production deployments may replace this with an external consortium peer
or managed Fabric Gateway endpoint, provided the mounted identity, MSP, TLS
material, channel, and chaincode configuration all match that runtime.

## Runtime Boundary

The app containers must reach Fabric through Docker-reachable hostnames.

Do not configure the worker/API to use `127.0.0.1:7051` unless the Fabric peer
is running inside the same container. In the production Compose stack, the
worker is its own container, so loopback points back to the worker container,
not the VM host and not a peer container.

Preferred VM-local values:

```text
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
FABRIC_ENABLED=true
FABRIC_MODE=gateway
FABRIC_CHANNEL=<channel>
FABRIC_CHAINCODE=<chaincode>
FABRIC_MSP_ID=Org1MSP
FABRIC_IDENTITY=appUser
FABRIC_IDENTITY_CERT_PATH=/run/secrets/fabric/identity/cert.pem
FABRIC_PRIVATE_KEY_PATH=/run/secrets/fabric/identity/key.pem
FABRIC_TLS_CERT_PATH=/run/secrets/fabric/tls/ca.crt
FABRIC_PEER_ENDPOINT=peer0.org1.example.com:7051
FABRIC_GATEWAY_URL=grpcs://peer0.org1.example.com:7051
FABRIC_GATEWAY_HOST_ALIAS=peer0.org1.example.com
```

The exact channel and chaincode names should come from deployment configuration
or existing repository secrets. Secret values and PEM bodies must never be
printed or committed.

## Required VM Layout

The app identity and TLS material must be generated from the same VM-local
Fabric network that will receive the anchor transaction:

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

`/run/secrets/fabric` is mounted read-only into API and worker containers.

The generated `env.generated` file should contain only environment assignments
needed by the containers. It is runtime material and must not be committed.

## Verification Sequence

1. Install or validate VM prerequisites: Docker, Docker Compose, Git, Bash,
   curl, jq, and Go if the selected Fabric deployment path needs it.
2. Install or fetch Fabric samples, binaries, and images into a deterministic VM
   path such as `/opt/mepn-fabric`.
3. Start the VM-local Fabric peer, orderer, and CA containers.
4. Create the configured channel.
5. Deploy the repository chaincode from `chaincode/audit-anchor-go`.
6. Enroll or generate an app identity authorized to submit/query the chaincode.
7. Export identity/TLS/profile/env files to `/run/secrets/fabric`.
8. Validate the secret layout without printing file contents:

   ```bash
   bash scripts/validate-fabric-secrets.sh /run/secrets/fabric
   ```

9. Restart the app stack with both `.env.production` and
   `/run/secrets/fabric/env.generated`.
10. Connect the app containers to the Fabric Docker network:

    ```bash
    bash infra/fabric/vm/connect-app-to-fabric-network.sh
    ```

    This is intentionally runtime-only instead of a static Compose external
    network so mock/default deployments do not fail when the Fabric test network
    is absent.

11. Confirm worker container name resolution and TCP reachability to the peer
    alias.
12. Create or retry a hash-record anchor request.
13. Continue only when:

    ```json
    {
      "verified": true,
      "status": "verified"
    }
    ```

    is returned by `GET /api/v1/hash-records/:id/fabric-verification`.

## Evidence Rules

Safe evidence:

- command names
- timestamps
- container names/statuses
- non-secret record ids
- sanitized endpoint hostnames
- verification status
- transaction id and block number returned by Fabric

Unsafe evidence:

- PEM blocks
- private keys
- TLS CA contents
- generated secret env files
- VM credentials
- tokens
- passwords
- raw connection strings

## Current Blocker Link

The active blocker note is:

```text
docs/evidence/blockers/2026-06-06-phase-2-slice-2-2-blocker.md
```

That blocker remains unresolved until a real VM-local or external Fabric
runtime produces a successful anchor and the API verifies it through chaincode
`ReadAnchor`.
