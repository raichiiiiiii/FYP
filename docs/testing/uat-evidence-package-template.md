# MEPN UAT Evidence Package Template

## Purpose

Use this template to collect reviewer evidence for a UAT session. Attach this
package to the UAT checklist and defect log.

## Session Metadata

| Field | Value |
|---|---|
| UAT date | |
| Tester | |
| Role | |
| Environment URL | |
| Commit/build label | |
| Browser and viewport | |
| Seed command used | |
| Seed output file | |
| Organization ID | |
| User email | |
| Data source label | API-backed seeded data / frontend fixture / mock adapter / not implemented |
| Fabric mode | mock / gateway / unavailable |
| Fabric evidence source | mock adapter / outbox pending / failed outbox / real Gateway transaction / not tested |

## Required Attachments

| Attachment | Required | Notes |
|---|---|---|
| Seed output JSON | Yes | Save the full `pnpm seed:uat` output. |
| Dashboard screenshot | Yes | Capture role-aware dashboard after login. |
| Procurement workflow screenshot | Yes | Capture requisition/PO/matching state relevant to the role. |
| Finance workspace screenshot | Yes | Capture relevant tab and role-scoped actions. |
| Evidence pack export | Yes, if available | Attach JSON/PDF export where supported. |
| Hash verification screenshot | Yes | Show stored hash, computed hash, source, and anchor state. |
| Integrations Fabric runtime screenshot | Yes | Show mock/gateway mode and adapter implementation state. |
| Audit timeline screenshot | Yes | Show events and anchor status labels. |
| Defect screenshots | If defects exist | Link each screenshot to a defect ID. |
| Deployment smoke logs | For deployment UAT | Include `curl` and `docker compose ps` output. |

## Fabric Evidence Capture Rules

Use these labels consistently:

| Label | Meaning |
|---|---|
| Mock adapter | Local adapter produced simulated anchor/reconciliation data. This is not real Fabric. |
| Outbox pending | Anchor request is queued or processing. It is not verified. |
| Failed outbox | Anchor request failed or is retrying. It is not verified. |
| Fabric unavailable | Gateway or worker evidence cannot be confirmed. |
| Real Gateway transaction | Backend shows real transaction/chaincode metadata after the real adapter is implemented. |

Do not mark a scenario as verified solely because it shows `ANCHORED_MOCK`.

## Scenario Evidence Table

| Scenario ID | Role | Route | Expected Evidence | Actual Evidence | Result | Attachment |
|---|---|---|---|---|---|---|
| | | | | | Pending | |

## Defect Cross-Reference

| Defect ID | Scenario ID | Attachment | Severity |
|---|---|---|---|
| | | | |

## Sign-Off

| Reviewer | Decision | Notes | Date |
|---|---|---|---|
| | Pass / Fail / Conditional pass | | |
