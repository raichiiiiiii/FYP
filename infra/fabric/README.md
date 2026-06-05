# Local Fabric Test Network

This folder contains the local development scaffold for running the MEPN
`audit-anchor` chaincode against a Hyperledger Fabric test network.

## Purpose

The local network is an implementation and integration-test target. It is not a
production consortium topology and it must not be used to claim regulated
production readiness.

## Repository boundaries

Committed:

- PowerShell wrappers under `infra/fabric/scripts/`
- Documentation
- Chaincode source under `chaincode/audit-anchor-go/`

Not committed:

- Fabric samples checkout
- MSP folders
- certificates
- private keys
- ledgers
- channel artifacts
- packaged chaincode archives
- copied Gateway credentials

## Prerequisites

Install these locally before running the network:

- Docker Desktop
- Git
- Bash, such as Git Bash or WSL Bash
- Go
- Hyperledger Fabric samples and binaries

The scripts expect a Fabric samples checkout at either:

```text
infra/fabric/.local/fabric-samples
```

or the path set in:

```text
FABRIC_SAMPLES_PATH
```

Example setup:

```powershell
mkdir infra\fabric\.local
git clone https://github.com/hyperledger/fabric-samples.git infra\fabric\.local\fabric-samples
```

Install Fabric sample binaries and container images according to the official
Fabric samples instructions for the Fabric version selected by the project.

## Check prerequisites

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\check-prereqs.ps1
```

Use report-only mode when you want a non-failing environment report:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\check-prereqs.ps1 -ReportOnly -AllowMissingFabricSamples
```

## Start network and deploy chaincode

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\start-local-network.ps1
```

Defaults:

```text
channel: mepn-audit
chaincode: audit-anchor
chaincode path: chaincode/audit-anchor-go
language: go
```

The wrapper calls Fabric samples `test-network/network.sh`:

```text
network.sh down
network.sh up createChannel -ca -c mepn-audit
network.sh deployCC -c mepn-audit -ccn audit-anchor -ccp <repo>/chaincode/audit-anchor-go -ccl go
```

## Export local Gateway material

After the test network is running, copy non-committed Org1 Gateway material into
`deploy/fabric/`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\export-gateway-env.ps1
```

The script writes:

```text
deploy/fabric/client.crt
deploy/fabric/client.key
deploy/fabric/ca.crt
infra/fabric/.local/fabric-gateway.env
```

Those files are ignored by git.

## Stop network

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\stop-local-network.ps1
```

## Current limitation

The repository contains the scaffold only. Real end-to-end anchoring still
requires:

- local Go/Fabric tooling installed;
- `go test ./...` passing for `chaincode/audit-anchor-go`;
- chaincode deployment to the local test network;
- worker real Fabric Gateway adapter implementation;
- gated real Fabric integration tests.
