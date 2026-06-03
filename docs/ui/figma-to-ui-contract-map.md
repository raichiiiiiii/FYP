# Figma to UI Contract Mapping

| Figma Make reference | Production area | UI contract responsibility | Implementation notes |
|---|---|---|---|
| `App.tsx` | App shell | Global shell, route outlet, role-aware navigation | Replace local view switching with production routing unless the repo intentionally uses local state. |
| `components/Sidebar.tsx` | Sidebar navigation | Navigation hierarchy and permissions | Drive visibility from route config and RBAC metadata. |
| `components/DashboardView.tsx` | Dashboard | Smart task inbox, KPIs, role home | Use typed dashboard DTOs and loading/empty/error states. |
| `components/ApplicationsList.tsx` | Mudarabah applications | Application list, filtering, status model | Use contract-defined application statuses. |
| `components/ApplicationWorkspace.tsx` | Application workspace | Due diligence, Shariah review, evidence, contract, monitoring | Implement incrementally. Do not fake approval/disbursement state. |
| `components/OpportunitiesView.tsx` | Opportunities | Create opportunity from PO, contract, or revenue document | Enforce revenue-generating eligibility rules. |
| `components/ProcurementView.tsx` | Procurement | Requisition, approval, RFQ, quotation, PO, receipt, invoice, matching | Align to SRS P2P/S2C workflows. |
| `components/NetworkCanvas.tsx` | Network canvas | Graph/canvas cockpit | Treat graph visibility as permission-controlled. |
| `components/LedgerView.tsx` | Ledger and P/L | Project ledger, profit/loss, distribution, loss exception | Do not calculate guaranteed fixed return. |
| `components/AuditView.tsx` | Audit and verification | Audit timeline, document hash, Fabric anchor verification | Never fake successful anchoring. Show pending, verified, failed, and unavailable states. |
| `components/IntegrationsView.tsx` | Integrations | ERP, Fabric, webhook, outbox, reconciliation | Use real adapter health states or explicit mock fixtures. |
| `components/OperationsView.tsx` | Operations | Deployment readiness, queue health, backup status | Useful for self-hosted SME node operations. |
| `components/AdminView.tsx` | Admin | Users, roles, permissions, organization settings | Enforce RBAC and audit user/role changes. |
| `components/ReportsView.tsx` | Reports | Procurement, finance, audit, integration reports | Keep export behavior aligned with requirements. |

## Mapping rule

Figma component -> production route -> UI contract section -> implementation behavior.

The UI Flow Contract is the behavioral authority. The Figma Make prototype is the visual and interaction reference.
