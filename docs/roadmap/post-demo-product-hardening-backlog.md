# Post-Demo Product Hardening Backlog

## Purpose

This backlog tracks product-hardening gaps that block production readiness but
do not block repository-level Fabric Gateway implementation work.

These items must not be mixed into the Fabric adapter slice. They need their
own requirements review, implementation plan, tests, and acceptance evidence.

## Backlog

| ID | Area | Module | Production gap | Why it matters | Fabric impact | Acceptance evidence | Status |
|---|---|---|---|---|---|---|---|
| HD-001 | Production OIDC and invitation flow | Identity and Access | Dev-login remains available and production OIDC/invite lifecycle is not complete. | Real SME deployments need governed authentication, invite expiry, session controls, and auditable identity lifecycle. | Does not block local Fabric anchoring; Fabric worker uses service configuration and outbox events. | OIDC ADR, provider config, invite expiry tests, session tests, deployment runbook. | Open |
| HD-002 | Report export hardening | Reporting | Backend aggregate DTOs and audited JSON report exports exist for FYP review, but PDF/spreadsheet/regulatory packs, closure-specific packs, scheduling, retention, and evidence-item registration are incomplete. | Reviewers need repeatable procurement, finance, audit, integration, closure, and regulatory-ready reports beyond JSON demo artifacts. | Does not block Fabric proof; Fabric evidence can be verified through hash/audit endpoints first. | Format-specific export tests, authorization tests, downloadable report E2E, retention/evidence registration proof. | Partial |
| HD-003 | Loss exception workflow | Mudarabah Finance | Loss exception handling is displayed but not fully workflow-complete. | Mudarabah correctness requires clear separation between genuine commercial loss and breach/negligence exceptions. | Does not block Fabric anchoring; it affects finance workflow completeness and closure readiness. | Backend state machine, Shariah/legal review fields, audit events, E2E for genuine loss and exception paths. | Open |
| HD-004 | Accessibility automation | Testing / UI Platform | Manual accessibility checks exist, but automated axe/keyboard/contrast gates are not configured. | Formal UAT and production review need evidence that role workflows are keyboard-usable and accessible. | Does not block Fabric proof; it affects review quality and release gates. | Automated accessibility test setup, critical route coverage, CI job or documented manual gate. | Open |
| HD-005 | Backend summary DTOs | Reporting / Operations / Dashboard | Some dashboard, graph, report, and operations cards still rely on typed fixtures or local summaries. | Demo screens are useful, but production operations need consistent API-backed summary data. | Does not block Fabric proof unless graph/operations summaries are used as evidence. | Backend aggregate endpoints, fixture removal plan, component/API tests. | Open |
| HD-006 | VM secret management | Operations / Integrations | Fabric certificate/key delivery to Azure VM is manual; optional CI writes runner-temp PEM files only for integration tests. | Real deployment needs repeatable secret rotation and delivery without committing identity material. | Blocks automated real Gateway deployment, but not local proof when operator supplies env/material manually. | Secret-management ADR or runbook, GitHub/self-hosted runner path, no secret logging, deployment smoke evidence. | Open |

## Operating Rule

For Fabric PBI-438, unresolved hardening items above should be reported as
production-readiness blockers only. They should not prevent completing
repository-implementable Fabric adapter, verification, graph, E2E, and
documentation phases.
