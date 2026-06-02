# Feature Intake: Read-Only Project Graph Canvas

Feature name:
Read-only project/opportunity graph

Owning module:
Graph/Canvas

Supporting modules:
Procurement, Evidence and Audit, Mudarabah Finance, Identity and Access

User role:
Organization admin, procurement officer, financier reviewer, Shariah reviewer,
auditor

Problem solved:
Reviewers need a network view of project, supplier, procurement, evidence, and
finance records without making the canvas another source of transaction data.

SRS/SDD mapping:
SDD modular monolith and graph/canvas visualization concerns; SRS auditability,
procurement workflow traceability, finance review traceability, and role-scoped
access control.

Screen affected:
- `/graph/projects`

API endpoint affected:
- `GET /api/v1/graph/projects/:projectId`

Database entity affected:
No new database entity. The read model derives from Organization, Supplier,
Project, Requisition, RFQ, Quotation, PurchaseOrder, Invoice, EvidencePack,
ProcurementOpportunity, MudarabahApplication, MudarabahContract, and ClosurePack.

Audit event required:
No. The graph is read-only and does not mutate records.

Permission required:
Active organization membership plus role-aware visibility. Finance nodes are
included only for roles allowed to review finance/audit context.

Outbox/integration side effect:
None. The graph is not required for core transaction processing.

Test required:
- Integration test for graph read model and finance node filtering
- E2E test for graph visibility and node-to-source navigation

Documentation update required:
This feature intake record documents the module roadmap entry.

Implementation notes:
The backend provides nodes, edges, source paths, and visibility metadata. The
frontend only renders the read model and navigates to source records.
