# Summary DTO Contract

## Purpose

This contract defines backend-owned summary DTOs for dashboard, procurement,
and finance review surfaces. Production UI routes must consume API summary DTOs
instead of importing Figma/demo fixtures.

## Shared DTOs

| DTO | Purpose |
|---|---|
| `SummaryMetricDto` | Numeric KPI with label, helper copy, severity, and optional target route. |
| `QueueItemDto` | Actionable work item for smart task queues. |
| `WorkflowBlockerDto` | Backend-owned blocker/exception summary with required action. |
| `ReviewReadinessDto` | Ready/total/missing state for evidence, approvals, contract, disbursement, closure, or loss exception readiness. |

## Endpoint DTOs

| DTO | Target endpoint |
|---|---|
| `DashboardSummaryDto` | `GET /api/v1/dashboard/summary` |
| `ProcurementSummaryDto` | `GET /api/v1/procurement/summary` |
| `FinanceSummaryDto` | `GET /api/v1/finance/summary` |

`GET /api/v1/dashboard/summary` currently returns the new contract fields
(`metrics`, `queue`, `blockers`, `readiness`) while preserving legacy dashboard
fields (`kpis`, `tasks`, `signals`, `activities`) for frontend compatibility.
The backend filters the new and legacy arrays according to role visibility.

## Role Visibility Rules

| Summary | Allowed role codes |
|---|---|
| Procurement | `ORG_ADMIN`, `PROCUREMENT_OFFICER`, `APPROVER`, `AUDITOR` |
| Finance | `ORG_ADMIN`, `FINANCE_ACCOUNTANT`, `FINANCIER_USER`, `SHARIAH_REVIEWER`, `AUDITOR` |
| Dashboard | Role-aware aggregate. Restricted data must still be filtered before returning role-specific queue, blocker, and readiness items. |

## Required Summary Topics

Dashboard/procurement/finance summaries should cover, where backed by data:

- pending approvals
- blocked workflows
- matching exceptions
- evidence gaps
- contract readiness
- disbursement readiness
- closure readiness
- unresolved loss exceptions
- Fabric anchor pending/failed counts
- outbox backlog counts

## Safety Rules

- Backend role filtering is authoritative.
- Finance summaries must not leak finance application state to procurement-only
  users.
- Procurement summaries must not expose write actions to finance-only users.
- Summary DTOs may include counts and routes, not confidential Fabric payloads,
  PEM material, private keys, tokens, or raw document contents.
- Figma Make data and frontend fixtures are not production summary sources.
