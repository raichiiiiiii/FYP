# HCI Heuristic Evaluation

| Field | Value |
| --- | --- |
| Product | MEPN |
| Evaluation type | Heuristic evaluation worksheet |
| Status | Prepared. Findings and scores are TBD until reviewer assessment and green route health evidence exist. |

## Heuristic Set

This worksheet adapts common usability heuristics to MEPN's procurement-finance, audit, and self-hosted operations context.

| ID | Heuristic | MEPN interpretation |
| --- | --- | --- |
| H01 | Visibility of system status | Workflow state, evidence completeness, queue/outbox state, Fabric status, and route loading state are visible and truthful. |
| H02 | Match with real workflows | Labels and task order match procurement, restricted mudarabah, Shariah review, audit, and operations language from the SRS/UI contract. |
| H03 | User control and freedom | Users can recover from navigation mistakes without losing work; restricted actions explain why they are blocked. |
| H04 | Consistency and standards | Production components, route metadata, role labels, status badges, and table/form patterns are consistent across modules. |
| H05 | Error prevention | Destructive or irreversible workflow transitions are guarded; fake success for Fabric/payment/disbursement/ledger closure is never shown. |
| H06 | Recognition over recall | Next actions, evidence gaps, reviewer roles, and state meanings are visible without requiring memorized workflow knowledge. |
| H07 | Flexibility and efficiency | Experienced users can move across dashboard, graph/canvas, procurement, finance, evidence, audit, operations, and reports efficiently. |
| H08 | Aesthetic and minimalist design | Screens remain dense enough for operations while avoiding unrelated marketing or decorative content. |
| H09 | Error recovery | API, validation, permission, integration, and Fabric unavailable states provide clear recovery or escalation paths. |
| H10 | Help and documentation | Contextual labels, empty states, export evidence, and reviewer docs explain what is required without relying on Figma mock behavior. |
| H11 | Accessibility | Keyboard navigation, semantic headings, focus management, contrast, labels, and error messaging align with WCAG 2.2 AA expectations. |
| H12 | Trust and auditability | Evidence, audit trail, immutable states, and proof panels communicate confidence level without overstating guarantees. |

## Evaluation Scope

| Route/surface | Persona | Heuristics to prioritize | Status |
| --- | --- | --- | --- |
| `/dashboard` | SME Admin, all users | H01, H04, H06, H07, H11 | Pending review |
| `/procurement` and procurement subroutes | Procurement Officer, Approver | H01, H02, H05, H06, H09, H11 | Pending review |
| `/finance/opportunities`, `/finance/applications/:id` | Financier User, Shariah Reviewer | H01, H02, H05, H06, H12 | Pending review |
| `/evidence/packs`, `/evidence/hashes` | Auditor, Procurement Officer | H01, H05, H09, H12 | Pending review |
| `/audit`, `/audit/search` | Auditor | H01, H06, H09, H12 | Pending review |
| `/graph/projects` | Cross-role reviewer | H01, H02, H06, H07, H12 | Pending review |
| `/operations`, `/reports`, `/evidence-package` | Admin, Auditor, Integrator | H01, H06, H09, H10, H12 | Pending review |

## Finding Template

| Finding ID | Heuristic | Route | Severity | Evidence | Impact | Recommended remediation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HCI-HEUR-TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Open |

Severity scale:

- Critical: User may complete a regulated, financial, audit, or irreversible action incorrectly.
- High: User is likely blocked or misled in a primary workflow.
- Medium: User can continue, but with avoidable confusion, delay, or support burden.
- Low: Minor clarity, consistency, polish, or efficiency issue.

## Evidence Rules

- Use screenshots from `docs/evidence/ux/screenshots/` only if they are generated from current production routes.
- Do not use Figma mock screens as proof of production behavior.
- Do not mark Fabric, payment, disbursement, ledger closure, or fixed-return behavior as successful without backend evidence.
- Do not record SUS or participant satisfaction values without participant survey data.

