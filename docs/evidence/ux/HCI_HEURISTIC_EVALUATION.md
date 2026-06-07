# HCI Heuristic Evaluation

| Field | Value |
| --- | --- |
| Product | MEPN |
| Evaluation type | Heuristic evaluation worksheet |
| Status | Prepared. Findings, scores, severity assignments, route health, SUS, and participant results remain unmeasured until real review or study evidence is recorded. |

## Heuristic Set

This worksheet adapts common usability heuristics to MEPN's procurement-finance, audit, and self-hosted operations context.

| ID | Heuristic | MEPN interpretation |
| --- | --- | --- |
| H01 | Visibility of system status | Workflow state, evidence completeness, queue/outbox state, Fabric status, route loading state, API health, worker health, and backup readiness are visible and truthful. |
| H02 | Match with real workflows | Labels and task order match procurement, restricted mudarabah, Shariah review, audit, and operations language from the SRS/UI contract. |
| H03 | User control and freedom | Users can recover from navigation mistakes, edit drafts before lock, cancel non-final actions, and understand immutable states. |
| H04 | Consistency and standards | Production components, route metadata, role labels, status badges, table/form patterns, and error panels are consistent across modules. |
| H05 | Error prevention/forgiveness | Destructive or irreversible transitions are guarded; invalid states explain missing prerequisites; users get recovery paths where recovery is allowed. |
| H06 | Recognition over recall | Next actions, evidence gaps, reviewer roles, state meanings, and proof confidence are visible without requiring memorized workflow knowledge. |
| H07 | Flexibility/efficiency | Experienced users can move across dashboard, graph/canvas, procurement, finance, evidence, audit, operations, and reports efficiently without losing task context. |
| H08 | Aesthetic/minimalist design | Screens stay operationally dense but readable, avoid decorative distraction, and expose only information relevant to the current role/task. |
| H09 | Error recovery | API, validation, permission, integration, Fabric unavailable, and route-unavailable states provide clear recovery or escalation paths. |
| H10 | Help and documentation | Contextual labels, empty states, evidence export labels, and reviewer docs explain what is required without relying on Figma mock behavior. |
| H11 | Accessibility | Keyboard navigation, semantic headings, focus management, contrast, labels, and error messaging align with WCAG 2.2 AA expectations. |
| H12 | Trust and auditability | Evidence, audit trail, immutable state, hash status, and proof panels communicate confidence level without overstating guarantees. |
| H13 | Financial and Shariah safety | UI does not imply guaranteed fixed returns, bypass Shariah approval, fake disbursement success, or close ledgers without evidence. |

## Evaluation Scope

| Route/surface | Persona | Heuristics to prioritize | Review status |
| --- | --- | --- | --- |
| `/dashboard` | SME Admin, all users | H01, H04, H06, H07, H08, H11 | Pending review |
| `/procurement` and procurement subroutes | Procurement Officer, Approver | H01, H02, H05, H06, H09, H11, H12 | Pending review |
| `/finance/opportunities` | Procurement Officer, Financier User | H01, H02, H05, H06, H07, H13 | Pending review |
| `/finance/applications`, `/finance/applications/:id` | Financier User, Shariah Reviewer | H01, H02, H05, H06, H09, H12, H13 | Pending review |
| `/finance/contracts` | Financier User, SME Admin | H01, H03, H05, H09, H12, H13 | Pending review |
| Disbursement panels/routes when present | Financier User, Finance/Accountant | H01, H05, H09, H12, H13 | Pending review |
| `/finance/ledgers`, `/finance/profit-loss`, `/finance/closures` | Finance/Accountant, Auditor | H01, H02, H05, H06, H12, H13 | Pending review |
| `/evidence/packs`, `/evidence/hashes`, `/evidence-package` | Auditor, Procurement Officer | H01, H05, H09, H10, H12 | Pending review |
| `/audit`, `/audit/search` | Auditor | H01, H06, H09, H12 | Pending review |
| `/graph/projects` | Cross-role reviewer | H01, H02, H06, H07, H08, H12 | Pending review |
| `/operations`, `/reports` | Admin, Auditor, Integrator | H01, H06, H07, H09, H10, H12 | Pending review |
| Access denied, loading, empty, and error states | All roles | H01, H03, H05, H09, H11 | Pending review |

## DECIDE Link

| DECIDE step | Heuristic evaluation handling |
| --- | --- |
| Determine goals | Prioritize status visibility, role clarity, evidence trust, recovery, and safe finance/Fabric language. |
| Explore questions | Convert each heuristic into route-specific questions and finding IDs. |
| Choose methods | Use expert heuristic review supported by Playwright screenshots when available. |
| Identify practical issues | Mark route/app/setup blockers separately from usability findings. |
| Decide ethical handling | Do not infer human usability from automation, and do not record participant metrics without participants. |
| Evaluate and present | Record severity, evidence path, impact, remediation, owner, and verification method. |

## Finding Template

| Finding ID | Heuristic | Route | Severity | Evidence | Impact | Recommended remediation | Owner | Source label | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HCI-HEUR-TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | `Expert-estimated` | Open |

Severity scale:

- Critical: User may complete a regulated, financial, audit, or irreversible action incorrectly.
- High: User is likely blocked or misled in a primary workflow.
- Medium: User can continue, but with avoidable confusion, delay, or support burden.
- Low: Minor clarity, consistency, polish, or efficiency issue.

## Review Prompts

| Heuristic | Prompts |
| --- | --- |
| Visibility of system status | Are loading, API, outbox, Fabric, evidence, contract, disbursement, ledger, and closure states explicit? Are stale or degraded states labelled? |
| Error prevention/forgiveness | Are unsafe transitions blocked before submission? Does the UI explain missing prerequisites? Is recovery available for drafts, retries, or navigation mistakes? |
| Flexibility/efficiency | Can experienced users jump between related records and routes without re-entering context? Are filters, tabs, shortcuts, or task links available where appropriate? |
| Aesthetic/minimalist design | Does the screen prioritize task-critical evidence and status? Is visual density usable rather than decorative or overwhelming? |
| Trust and auditability | Does each proof or audit label state whether evidence is local, pending, unavailable, failed, mock, anchored, or verified? |
| Financial and Shariah safety | Does the interface avoid fixed-return language and avoid implying approval, signature, disbursement, or closure before the required gates are complete? |

## Evidence Rules

- Use screenshots from `docs/evidence/ux/screenshots/` only if they are generated from current production routes during a recorded run.
- Do not use Figma mock screens as proof of production behavior.
- Do not mark Fabric, payment, disbursement, ledger closure, or fixed-return behavior as successful without backend evidence.
- Do not record SUS or participant satisfaction values without participant survey data.
- Record SUS only as `Not measured — participant survey required` unless real participant survey responses exist.
