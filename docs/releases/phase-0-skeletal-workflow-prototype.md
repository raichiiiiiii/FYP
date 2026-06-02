# Phase 0 Release: MEPN Skeletal Workflow Prototype

## Status
Accepted baseline

## Baseline Name
MEPN skeletal workflow prototype

## Purpose
This baseline freezes the current MVP prototype before UI polish or major feature expansion. It captures the current working shell and skeletal workflow so the project can always return to a known runnable state.

## Validated Workflow Coverage
- Dashboard health
- Organization setup
- Procurement requisition state
- Evidence pack export
- Audit events
- Finance application workspace
- Closure pack state

## Baseline Evidence
The current screenshots are retained under `docs/ui/assets/` and documented in `docs/ui/skeletal-web-ui-workflow.md`.

## Release Note
This release validates skeletal workflow coverage, not production UI readiness.

## Validation
Validated locally on June 2, 2026:

- `pnpm install`
- `pnpm lint`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm test:ci`

## Not Included Yet
- Full production UI polish
- Major new finance, Fabric, or ERP features
- Full OAuth/OIDC authentication
- Production deployment hardening

## Deployment Target
Prototype/staging on Azure.

## Deployment Status
Azure deployment is pending because this local environment does not currently have Azure CLI, Azure Developer CLI, Azure PowerShell, or an Azure deployment manifest configured. The baseline is ready to deploy once Azure tooling, credentials, and target resources are available.
