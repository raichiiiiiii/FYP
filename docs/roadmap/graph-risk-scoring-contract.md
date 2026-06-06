# Graph Risk Scoring Contract

## Purpose

This contract defines backend-owned graph risk metadata for the MEPN project
graph/canvas. It is the source for Phase 9 implementation slices and prevents
the UI from inventing risk labels from Figma/demo state.

## DTO Shape

Graph nodes and edges may expose a `risk` object when the actor is authorized
to see the source record.

```ts
type GraphRiskMetadata = {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskReasons: string[]
  sourceEntityIds: string[]
  visibilityScope: 'procurement' | 'finance' | 'audit' | 'operations'
}
```

Rules:

- `riskReasons` must be human-readable but must not reveal hidden entity names,
  IDs, statuses, or finance context.
- `sourceEntityIds` may only include IDs for entities already visible to the
  current actor.
- Risk metadata must be computed after role filtering or filtered again before
  returning the API payload.
- Figma Make risk badges are visual reference only.

## Initial Risk Rules

| Rule | Risk level | Visibility scope | Source |
|---|---|---|---|
| Failed Fabric anchor for a visible hash/evidence record | high | audit / operations | `AuditAnchor.status = FAILED` |
| Pending real Fabric anchor for a visible hash/evidence record | medium | audit / operations | `AuditAnchor.status in PENDING/ANCHOR_REQUESTED` |
| Evidence checklist has missing required items | high | finance | `EvidenceChecklistItem.status != COMPLETED` |
| Application waiting for due diligence or Shariah review | medium | finance | `MudarabahApplication.status` review states |
| Unresolved loss exception | critical | finance | `LossException.status in OPEN/UNDER_REVIEW/CLASSIFIED` |
| Procurement approval backlog exists | medium | procurement | pending `ApprovalRequest` records |
| Receipt/invoice matching exception | high | procurement | matching status not `MATCHED` |
| Failed outbox event for a visible source record | high | operations | `OutboxEvent.status = FAILED` |

## Role Visibility

| Role | Procurement risk | Finance risk | Audit/hash/anchor risk | Operations/outbox risk |
|---|---|---|---|---|
| `ORG_ADMIN` | yes | yes | yes | yes |
| `PROCUREMENT_OFFICER` | yes | no | procurement/evidence only | no |
| `APPROVER` | yes | no | procurement/evidence only | no |
| `FINANCIER_USER` | no | yes | finance/evidence only | no |
| `SHARIAH_REVIEWER` | no | yes | finance/evidence only | no |
| `AUDITOR` | yes | yes | yes | yes |

Unauthorized graph responses must remove:

- hidden finance nodes;
- hidden hash/anchor nodes that only relate to hidden finance source records;
- hidden edges attached to removed nodes;
- hidden risk reasons, labels, tooltips, and DOM-visible text;
- hidden risk source IDs.

## Query Filter Contract

Phase 9 query filters should support:

- `nodeType`
- `riskLevel`
- `includeFinance`
- `includeAnchors`
- `status`

Unauthorized filters must not reveal hidden data. For example,
`includeFinance=true` from a procurement-only actor must return the same
finance-hidden graph or a clear 403/filtered response, never finance node labels
or counts.

## Saved View Contract

Saved graph views are implemented for the FYP review scope. They store only:

- owner/organization IDs;
- filter JSON;
- layout JSON for visible nodes;
- visibility setting.

Current implementation supports private and organization-shared views. Saved
view layout data is limited to safe UI state such as zoom; persisted drag/drop
node positions remain deferred until a backend policy can guarantee hidden nodes
are not stored or replayed for unauthorized actors.

## Open Decisions

- Whether risk ageing thresholds should be time-based or count-based.
- Whether procurement officers should see evidence anchor risk for finance
  applications derived from procurement source records.
- Whether saved views should later support persisted node positions,
  annotations, or team-curated default views.
