# Loss Exception Workflow Contract

## Purpose

This document defines the implementation contract for handling negative
profit/loss outcomes in MEPN without turning mudarabah into fixed-return or
guaranteed-capital logic.

It is a domain contract for implementation and review. It is not a legal,
Shariah, accounting, or regulatory ruling.

## Source Basis

Source-of-truth requirements:

- `docs/requirements/mudarabah_eprocurement_srs.tex`
- `docs/design/mepn_software_design_description.tex`
- `docs/ui/mepn-ui-contract-flow.md`
- `docs/ui/mepn-ui-contract-flow-appendix.md`

Relevant source principles:

- Profit is shared by pre-agreed ratio.
- Genuine commercial loss is borne by capital in a mudarabah arrangement.
- Loss exception handling applies only where breach, negligence, misconduct,
  fraud, or another agreed contractual exception is proven.
- MEPN must not calculate guaranteed fixed returns.
- MEPN must preserve reviewer/auditor evidence and audit trails for state
  changes.

## Classification Values

| Classification | Meaning | Closure effect |
|---|---|---|
| `GENUINE_COMMERCIAL_LOSS` | Negative result appears to come from ordinary commercial risk with sufficient evidence. | Closure may proceed after reviewer decision. No profit distribution is generated. |
| `BREACH` | Contractual obligation or restricted-use term appears breached. | Closure remains blocked until reviewer decision and required remedy/notes are recorded. |
| `NEGLIGENCE` | Loss may be caused by failure to exercise expected care. | Closure remains blocked until reviewer decision and evidence are recorded. |
| `MISCONDUCT` | Loss may be caused by improper conduct outside ordinary commercial risk. | Closure remains blocked until reviewer decision and evidence are recorded. |
| `FRAUD` | Loss may be caused by intentional deception or falsified records. | Closure remains blocked until reviewer decision and escalation metadata are recorded. |
| `INSUFFICIENT_EVIDENCE` | Reviewer cannot classify the loss from available evidence. | Closure remains blocked until evidence is added or a permitted reviewer override is recorded. |

## Lifecycle States

| State | Description | Allowed next states |
|---|---|---|
| `OPEN` | Loss exception was created from a negative P/L outcome or reviewer action. | `EVIDENCE_REQUESTED`, `UNDER_REVIEW`, `CANCELLED` |
| `EVIDENCE_REQUESTED` | Reviewer needs additional evidence before classification. | `UNDER_REVIEW`, `CANCELLED` |
| `UNDER_REVIEW` | Reviewer is assessing evidence and classification. | `CLASSIFIED`, `REJECTED`, `EVIDENCE_REQUESTED` |
| `CLASSIFIED` | Reviewer selected a classification and recorded rationale. | `RESOLVED`, `REOPENED` |
| `REJECTED` | Reviewer rejected the exception record as invalid or duplicate. | `REOPENED` |
| `RESOLVED` | Required decision/evidence exists and closure may evaluate its gate. | `REOPENED` |
| `REOPENED` | Previously closed/rejected/classified issue needs review again. | `UNDER_REVIEW`, `EVIDENCE_REQUESTED` |
| `CANCELLED` | Exception was cancelled because it was entered incorrectly before review. | None |

## Backend Source-Of-Truth Rules

1. A negative P/L statement may create an initial `LossException`, but the
   backend must not treat that initial record as resolved.
2. Closure export/completion must be blocked while any unresolved loss
   exception exists for the application.
3. Closure may proceed only when every related loss exception is in `RESOLVED`
   or `REJECTED`, and the latest reviewer decision is available.
4. `GENUINE_COMMERCIAL_LOSS` must not generate a profit distribution or
   guaranteed capital return.
5. Breach/negligence/misconduct/fraud classifications must remain separate
   from ordinary commercial loss.
6. Frontend disabled buttons and warnings are secondary guardrails only; API
   and service-level checks are authoritative.
7. Every state-changing mutation must emit an audit event.
8. Mutations that should trigger external review, notification, evidence
   processing, or integration work must emit an outbox event where supported.
9. Invalid transitions must return a clear 4xx error with:
   - `code`
   - `message`
   - `requiredState`
   - `actualState`
   - `nextAllowedActions`

## Permission Contract

| Action | Allowed roles |
|---|---|
| Create initial loss exception | `ORG_ADMIN`, `FINANCE_ACCOUNTANT`, `FINANCIER_USER` |
| Attach evidence/reference | `ORG_ADMIN`, `FINANCE_ACCOUNTANT`, `FINANCIER_USER`, `SHARIAH_REVIEWER`, `AUDITOR` |
| Request evidence | `ORG_ADMIN`, `FINANCIER_USER`, `SHARIAH_REVIEWER`, `AUDITOR` |
| Classify exception | `ORG_ADMIN`, `FINANCIER_USER`, `SHARIAH_REVIEWER` |
| Resolve exception | `ORG_ADMIN`, `FINANCIER_USER`, `SHARIAH_REVIEWER` |
| Reopen exception | `ORG_ADMIN`, `FINANCIER_USER`, `SHARIAH_REVIEWER`, `AUDITOR` |
| Read exception | Any role that can read the underlying application or audit record, subject to existing finance visibility rules. |

## Evidence Requirements

Minimum reviewer-facing fields:

- application id
- profit/loss statement id
- exception amount
- classification
- lifecycle status
- reviewer user id
- reviewer notes/rationale
- linked evidence item ids or document ids
- decision timestamp
- audit event ids
- outbox event ids where applicable

Open product/legal decisions:

- exact required evidence per classification
- whether fraud/misconduct requires external case reference fields
- whether Shariah review and financier review must both sign off for every
  non-genuine-loss classification
- whether a resolved breach/negligence/fraud path should automatically block
  distribution until a separate settlement workflow exists

## API Slice Targets

Planned endpoints:

- `POST /api/v1/loss-exceptions`
- `GET /api/v1/loss-exceptions`
- `GET /api/v1/loss-exceptions/:id`
- `POST /api/v1/loss-exceptions/:id/evidence`
- `POST /api/v1/loss-exceptions/:id/decision`
- `POST /api/v1/loss-exceptions/:id/close`
- `POST /api/v1/loss-exceptions/:id/reopen`

## Acceptance Criteria For Implementation

- Backend rejects invalid transitions through direct API calls.
- Closure export is blocked by unresolved loss exceptions.
- Closure is allowed after valid reviewer resolution.
- Every loss exception mutation is audited.
- External/async follow-up work is represented through outbox where supported.
- UI states make genuine loss distinct from breach/negligence/misconduct/fraud.
- No code path calculates a guaranteed fixed return.
