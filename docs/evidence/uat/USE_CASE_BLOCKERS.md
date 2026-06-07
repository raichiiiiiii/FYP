# SRS Use Case UAT Blockers

Last updated: 2026-06-07

This file records known execution gaps for the SRS use case simulation. It does
not claim that a seeded route screenshot proves a full business mutation unless
the corresponding UI/API path exists and is exercised by the test.

## Cross-Cutting Blockers And Limitations

| ID | Area | Severity | Status | Notes | Recommended Fix |
|---|---|---:|---|---|---|
| UAT-B-001 | Role model | Medium | Accepted MVP limitation | `Role.code` is globally unique and each membership has one `roleId`. Current MVP assigns one primary role per user per organization. | Add organization-scoped roles and membership role assignments in a later schema migration. |
| UAT-B-002 | Authentication | Medium | Accepted MVP limitation | Seeded accounts store only `passwordHash`; current local demo login remains dev/OIDC-oriented and does not authenticate with this password. | Add production OIDC UAT or a deliberate local password-auth ADR before using password login. |
| UAT-B-003 | Fabric topology | High | Intentional boundary | MEPN records governance metadata and readiness checks only. Direct API channel creation, channel joining, MSP onboarding, admin key custody, and real topology mutation are not implemented. | Keep ADR-015 boundary unless a future operator-agent ADR approves managed key custody. |
| UAT-B-004 | Fabric proof | High | Intentional boundary | Seeded hash and anchor metadata must not be treated as real Fabric verification. Positive verification requires backend ReadAnchor chaincode query and hash comparison. | Configure live Fabric Gateway and run the existing gated proof UAT when real proof evidence is needed. |
| UAT-B-005 | Cross-node collaboration | Medium | Partial | The seed creates multiple organization nodes, but some workflows are represented in one local operational database for UAT visibility. | Add inter-node API invitation/workspace flows and explicit cross-node synchronization contracts. |
| UAT-B-006 | Release/update node lifecycle | Medium | Hardening | UC-16 is currently evidenced through setup/update docs, operations visibility, backup/restore scripts, and readiness surfaces. Full release manifest/update execution UI is not yet implemented. | Add release manifest parser, preflight result persistence, upgrade run records, and rollback evidence UI. |
| UAT-B-007 | Node/channel compatibility | Medium | Partial | UC-18 currently maps to Fabric automation readiness and governance surfaces. A general `GET /api/v1/node/status` endpoint is not yet implemented. | Add node status endpoint with app version, schema version, feature flags, canonical hash version, report schema, and chaincode compatibility. |

## Use-Case Execution Notes

| Use case | Current UAT behavior | Blocker handling |
|---|---|---|
| UC-01 | Route-backed through organization profile and operations/health visibility. | None if route renders. |
| UC-02 | Route-backed through dev session state and role-aware navigation. | Password-form login is not tested because local demo auth is dev/OIDC oriented. |
| UC-03 | Route-backed supplier list/detail evidence where available. | Implement supplier detail/edit route if deeper document review is required. |
| UC-04 | Route-backed RFQ/quotation evidence where available. | Implement richer quotation comparison UI if award recommendation mutation is required. |
| UC-05 | Route-backed purchase order, receipt, invoice, and matching evidence where available. | Implement missing receipt/invoice mutation UI if route is read-only. |
| UC-06 | Route-backed opportunity visibility. | Supplier-owned cross-node publishing remains partial. |
| UC-07 | Route-backed application visibility. | End-to-end supplier submission may be read-only/seed-backed. |
| UC-08 | Route-backed application/due diligence visibility. | If reviewer mutation controls are missing, keep as partial and implement workflow actions. |
| UC-09 | Route-backed application/Shariah visibility. | If reviewer mutation controls are missing, keep as partial and implement workflow actions. |
| UC-10 | Route-backed contracts/disbursement visibility. | Real e-signature and payment API execution remain external integration hardening. |
| UC-11 | Route-backed ledger/project monitoring visibility. | Evidence request mutation can be added if required. |
| UC-12 | Route-backed profit/loss and closure visibility. | Profit distribution must remain ratio-based; no fixed return logic is allowed. |
| UC-13 | Route-backed graph canvas visibility. | Preserve graph role no-leak behavior. |
| UC-14 | Route-backed evidence/hash visibility. | Fabric Gateway unavailable must show pending/unavailable, not verified. |
| UC-15 | Route-backed integrations/reconciliation visibility. | Real ERP adapter remains integration hardening unless configured. |
| UC-16 | Documentation/operations-backed. | Full release package update UI is hardening. |
| UC-17 | Governance/readiness-backed. | Real topology mutation is intentionally blocked. |
| UC-18 | Readiness-backed. | General node status endpoint is recommended hardening. |
