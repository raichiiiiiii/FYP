# Product Hardening Backlog

## Purpose

This backlog separates demo/FYP readiness from credible production readiness.
The current implementation prioritizes repeatable local and Azure VM evidence;
the items below must be completed before regulated or real financial use.

| Item | Problem | Target behavior | Implementation slice | Acceptance criteria | Priority | Dependencies | Evidence required |
|---|---|---|---|---|---|---|---|
| Real OIDC/invitation flow | Dev login and manual organization handoff are acceptable for demo but not production auth. | Users authenticate through OIDC or validated invite tokens with audited membership creation. | Add provider config, callback handling, invite validation, expiry/revocation, and role claim mapping. | Login works without dev-auth fields; expired/revoked invites are rejected; membership changes are audited. | High | OIDC provider, invite policy, role matrix | Auth E2E, audit logs, UAT screenshots |
| Report export hardening | JSON and CSV report exports exist for FYP review, but production report packs are not complete reviewer artifacts. | Procurement, finance, audit, integration, closure, and regulatory reports export audited files in agreed formats. | Add PDF/spreadsheet formats, scheduled report packs, evidence-item registration, retention rules, and production layouts. | JSON/CSV exports remain audited; additional formats create downloadable artifacts and audit records; failed exports are visible. | High | Report DTOs, object storage, report format decision | Unit/API tests, downloaded sample reports, UAT screenshots |
| Loss exception workflow | Negative P/L can be recorded, but genuine loss vs breach/negligence classification is incomplete. | Reviewers classify commercial loss, negligence, misconduct, fraud, or breach with evidence. | Add loss exception endpoints, evidence requirements, reviewer decisions, and closure gates. | Closure cannot complete unresolved exception paths; no guaranteed fixed return is calculated. | High | Shariah/legal decision model | Workflow tests, UAT scenario |
| Accessibility automation | Manual improvements exist without automated axe/contrast coverage. | Demo-critical routes have automated accessibility smoke tests. | Add Playwright axe or equivalent, focus checks, and contrast checks. | CI reports accessibility failures for dashboard, finance workspace, audit, graph, admin, and reports. | Medium | Tooling approval | CI logs, accessibility report |
| Backup/restore evidence | VM docs mention backups, but repeatable restore proof is limited. | Operators can back up and restore PostgreSQL/object storage demo data. | Add backup scripts, restore scripts, and smoke-test checklist. | Restore produces a working app with expected records. | Medium | Storage policy | Restore run log |
| Production secret management ADR | Current demo uses GitHub secrets and VM files; production secret store decision is deferred. | Secret source, rotation, file ownership, and container mount rules are documented. | Keep current ADR and revisit managed secret store options. | No secret contents committed or logged; rotation runbook exists. | High | Deployment target decision | ADR, workflow logs |
| Gateway credential rotation runbook | Fabric Gateway cert/key rotation is manual without a dedicated checklist. | Operators rotate cert/key/TLS secrets safely through GitHub Actions and VM validation. | Add rotation steps and validation commands to deployment docs. | New secret material is deployed; old material is replaced; validation passes. | High | Fabric MSP operator access | Sanitized workflow evidence |
| Production monitoring/readiness checks | Health checks cover API/database/Redis but not full business readiness. | Readiness distinguishes API health, worker heartbeat, outbox backlog, and Fabric Gateway readiness. | Add readiness endpoint and operations UI status mapping. | `/ready` returns degraded/unavailable when required workers/integrations are down. | Medium | Worker heartbeat, Fabric status | API tests, smoke output |
| Disaster recovery notes | Single-VM deployment has limited DR procedure. | Document RPO/RTO assumptions and recovery steps for demo and future production. | Add DR section to deployment docs. | Reviewer can identify limitations and recovery sequence. | Medium | Backup/restore scripts | DR checklist |
| Reviewer-facing UAT evidence package | Evidence capture is partially automated and partly manual. | UAT bundles seed output, screenshots, test results, deployment evidence, and known limitations. | Add evidence collection runner and report template fill step. | UAT package can be reproduced from a clean VM/demo run. | Medium | E2E screenshots, seed script | Generated package |

## Current Demo Boundary

- GitHub repository secrets are acceptable for the current Azure Student VM demo.
- Fabric Gateway material is materialized on the VM under `/run/secrets/fabric`.
- Containers mount the Fabric directory read-only.
- Mock/demo paths remain available for deterministic local tests.
- `verified=true` for Fabric proof requires a successful chaincode `ReadAnchor`
  query; stored metadata alone is not enough.
