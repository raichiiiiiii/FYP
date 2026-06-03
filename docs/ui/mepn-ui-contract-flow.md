# MEPN UI Contract Flow

## 1. Document Control

| Item | Value |
|---|---|
| Product | Mudarabah-Enabled Procurement Network |
| Codename | MEPN |
| Document type | UI Contract Flow |
| Repository path | `docs/ui/mepn-ui-contract-flow.md` |
| Source documents | `docs/requirements/mudarabah_eprocurement_srs.tex`, `docs/design/mepn_software_design_description.tex`, `docs/ui/skeletal-web-ui-workflow.md`, `docs/roadmap/module-roadmap.md` |
| Owner | Product / UI Architect |
| Target readers | Frontend developers, backend developers, QA, supervisor |
| Status | Draft / Review |
| Draft scope | First implementation-ready slice: product flow, role model, Mudarabah Application Workspace, evidence/audit/outbox matrix, Definition of Ready, Definition of Done |

---

## 2. Applicable Standards and Modeling Rules

| Area | Standard / notation | Usage |
|---|---|---|
| Requirements | ISO/IEC/IEEE 29148-style SRS | Requirement traceability and acceptance evidence |
| Architecture | ISO/IEC/IEEE 42010-style views + SDD | Stakeholders, concerns, design views, bounded contexts |
| Business process | BPMN 2.0 vocabulary | Cross-role procurement-finance workflow, gateways, swimlanes |
| State lifecycle | UML State Machine vocabulary | Allowed status transitions and blocked transitions |
| Runtime interaction | UML Sequence Diagram vocabulary | UI to API to service to worker to external integration calls |
| API contract | OpenAPI | REST request and response contracts |
| Auth | OAuth 2.0 + OIDC + PKCE | Login, identity, claims, scopes, delegated access |
| Accessibility | WCAG 2.2 AA | Forms, tables, keyboard navigation, errors, contrast, focus management |

Every important UI screen must have the following contracts before implementation is considered ready:

1. Role contract.
2. State contract.
3. Data contract.
4. Action contract.
5. API contract.
6. Audit, evidence, and outbox contract.
7. Error-state contract.
8. SRS/SDD traceability.

This document uses the current skeletal implementation as a baseline, but it defines the target implementation contract. When current behavior differs from target behavior, the gap is explicitly marked as an implementation backlog item.

---

## 3. Product UI North Star

MEPN is not a generic procurement dashboard.

MEPN is an evidence-driven procurement-finance workspace where a revenue-generating procurement opportunity can be converted into a restricted mudarabah application, reviewed by financiers and Shariah/compliance users, executed through controlled procurement, monitored through project evidence, and closed with auditable profit/loss records.

The UI must always make this relationship visible:

```text
Procurement evidence
→ Financing decision
→ Shariah review
→ Contract
→ Disbursement
→ Project ledger
→ Profit/loss
→ Closure pack
→ Audit/Fabric verification
```

### 3.1 Product implications for the UI

| Product principle | UI implication |
|---|---|
| Procurement evidence is the financing evidence layer | Finance screens must show linked buyer demand, requisition, RFQ, quotation, PO, receipt, invoice, payment, ERP posting, and evidence status instead of treating the application as a standalone loan form. |
| Restricted mudarabah is project-scoped | Every application view must show project, opportunity, permitted use of capital, allowed cost categories, buyer revenue source, profit ratio, and loss-treatment status. |
| Financier monitoring must not become day-to-day procurement control | Financier views must expose risk, milestones, evidence gaps, disbursement status, and ledger status, but must not allow editing SME procurement source records. |
| Shariah/compliance review is a separate gate | Shariah screens must have their own decision records, checklist, evidence, and immutable reviewer opinion. They must not be collapsed into financial due diligence approval. |
| Auditability is a first-class product feature | Material actions must show audit event creation, evidence effects, outbox status, hash status, and Fabric anchor status where applicable. |
| The graph/canvas is the cockpit | The long-term primary journey should start from a graph/canvas view that reveals organizations, suppliers, buyers, opportunities, contracts, evidence, risk, and finance links. |

### 3.2 Current skeletal baseline to refactor

The current skeletal workflow already demonstrates a working local path across dashboard, organization setup, procurement, evidence pack export, audit event review, mudarabah application workflow, and closure state. The next UI refactor should move from this sequential navigation:

```text
Dashboard → Setup → Procurement → Evidence → Audit → Finance → Closure
```

into this role-aware procurement-finance cockpit:

```text
Graph/Canvas Cockpit
  → Opportunity Workspace
  → Procurement Evidence
  → Mudarabah Application
  → Due Diligence
  → Shariah Review
  → Contract and Disbursement
  → Ledger and Profit/Loss
  → Closure Pack
  → Audit/Fabric Verification
```

---

## 4. Primary End-to-End Product Flow

### 4.1 Target journey

```text
Organization Setup
  ↓
Create Project
  ↓
Register Buyer Demand
  ↓
Create Revenue-Generating Procurement Opportunity
  ↓
Generate Evidence Checklist
  ↓
Prepare Procurement Evidence
  ↓
Submit Mudarabah Application
  ↓
Financier Due Diligence
  ↓
Shariah / Compliance Review
  ↓
Generate Restricted Mudarabah Contract
  ↓
Execute Contract / E-Sign
  ↓
Controlled Disbursement
  ↓
Procurement Execution and Monitoring
  ↓
Project Ledger Update
  ↓
Profit/Loss Calculation
  ↓
Profit Distribution or Loss Exception
  ↓
Closure Pack Export
  ↓
Audit / Hash / Fabric Verification
```

### 4.2 BPMN-style swimlane contract

| Step | Primary lane | Supporting lanes | Primary route | Gateway / state output | Required side effects |
|---|---|---|---|---|---|
| Configure organization | SME Admin | System | `/org/setup`, future `/admin/organization` | Organization, admin, workspace exist | `ORGANIZATION_CREATED`, role/membership audit event |
| Create project | Procurement Officer | SME Admin | `/graph/projects`, `/procurement/projects` | Project status active | Project audit event; graph node created or refreshed |
| Register buyer demand | Procurement Officer | Buyer / integration | `/finance/opportunities/new` | Buyer demand or source document linked | Document/evidence item created; optional ERP import outbox |
| Create procurement opportunity | Procurement Officer | Finance/Accountant | `/finance/opportunities/new` | `ProcurementOpportunity` created | `PROCUREMENT_OPPORTUNITY_CREATED`; graph edge to buyer/project/evidence pack |
| Generate evidence checklist | Procurement Officer / Financier User | Policy/Rule Engine | `/finance/applications/:applicationId/evidence` | Application becomes `EVIDENCE_PENDING` or `DUE_DILIGENCE_IN_REVIEW` | `EVIDENCE_CHECKLIST_GENERATED`; checklist items created |
| Complete evidence gaps | Procurement Officer | Supplier User, Finance/Accountant | `/finance/applications/:applicationId/evidence` | Checklist item `COMPLETED`; checklist `COMPLETED` when all complete | `EVIDENCE_CHECKLIST_ITEM_COMPLETED`; document version/hash where applicable |
| Submit application | Procurement Officer | SME Admin | `/finance/applications/:applicationId` | `DRAFT → SUBMITTED` | `MUDARABAH_APPLICATION_SUBMITTED`; outbox notification to financier workspace |
| Perform due diligence | Financier User | Procurement Officer, Finance/Accountant | `/finance/applications/:applicationId/due-diligence` | `DUE_DILIGENCE_IN_REVIEW → SHARIAH_IN_REVIEW` or `REJECTED` | `DUE_DILIGENCE_RECORDED`; conditions stored; evidence locked for decision |
| Perform Shariah review | Shariah Reviewer | Financier User | `/finance/applications/:applicationId/shariah-review` | `SHARIAH_IN_REVIEW → APPROVED-ready` or `REJECTED` | `SHARIAH_REVIEW_RECORDED`; opinion/checklist stored |
| Approve application | Financier User | Shariah Reviewer | `/finance/applications/:applicationId` | `SHARIAH_IN_REVIEW → APPROVED` after both review gates pass | `MUDARABAH_APPLICATION_APPROVED` |
| Generate contract | Financier User | Evidence/Documents, E-sign | `/finance/contracts` or application contract panel | `APPROVED → CONTRACT_PENDING_SIGNATURE` | `MUDARABAH_CONTRACT_CREATED`; contract record |
| Generate contract document / e-sign package | Financier User | E-sign adapter | `/finance/contracts` | Contract document version exists | `MUDARABAH_CONTRACT_DOCUMENT_GENERATED`; `ESIGNATURE_PACKAGE_REQUESTED` outbox |
| Mark signed / execute contract | Financier User | SME Admin, e-sign adapter | `/finance/contracts` | `CONTRACT_PENDING_SIGNATURE → CONTRACT_EXECUTED` | `MUDARABAH_CONTRACT_SIGNED`; contract immutable version locked |
| Record disbursement | Financier User | Finance API / bank adapter | `/finance/applications/:applicationId` | `CONTRACT_EXECUTED → DISBURSED` | `DISBURSEMENT_RECORDED`; optional finance API outbox |
| Monitor execution and ledger | Finance/Accountant | Procurement Officer, Supplier User, Financier User | `/finance/ledgers` | `DISBURSED → MONITORING` | `PROJECT_LEDGER_ENTRY_RECORDED`; ERP reconciliation outbox where applicable |
| Calculate profit/loss | Finance/Accountant | Financier User, Shariah Reviewer | `/finance/profit-loss` | `MONITORING → PROFIT_LOSS_CALCULATED` or loss exception path | `PROFIT_LOSS_STATEMENT_CREATED`; distribution/loss exception records |
| Export closure pack | Auditor / Financier User | Evidence/Audit, Fabric adapter | `/finance/closures` | `PROFIT_LOSS_CALCULATED → CLOSED` | `CLOSURE_PACK_EXPORTED`; evidence pack hash; Fabric anchor request where enabled |
| Verify audit/evidence | Auditor | Fabric adapter | `/audit/entity/:entityType/:entityId` | Verification status recorded | `HASH_VERIFIED`, `FABRIC_ANCHOR_VERIFIED`, exception if mismatch |

### 4.3 Critical gateways

| Gateway | Required decision | Blocked when | Responsible backend enforcement |
|---|---|---|---|
| Revenue-generating opportunity? | Only separately measurable revenue or margin can enter mudarabah flow. | Opportunity is routine internal consumption or has no buyer demand/revenue source. | Opportunity/application service validation. |
| Evidence complete? | Required procurement, financial, and policy evidence must be completed or explicitly waived. | Any non-waived checklist item remains `PENDING`. | Evidence checklist service and finance transition guards. |
| Due diligence approved? | Financier records decision and conditions. | Due diligence report is missing or rejected. | Finance service before Shariah review and application approval. |
| Shariah approved? | Shariah reviewer records eligible activity, contract form, profit ratio, loss treatment, and allowed expenses. | Shariah review is missing or rejected. | Finance service before application approval and contract generation. |
| Contract signed? | Contract document is generated and signed by required parties. | Contract missing, unsigned, or document version not locked. | Contract service before disbursement. |
| Ledger evidence complete? | Revenue, capital, allowed costs, payments, and ERP postings are linked or waived. | Missing revenue or cost evidence. | Ledger and profit/loss service before calculation. |
| Loss exception? | Genuine commercial loss is separated from negligence, fraud, misconduct, or breach. | Loss case lacks reviewer classification. | Profit/loss service and loss exception workflow before closure. |
| Closure auditable? | Closure pack contains evidence, decisions, ledger, P/L, audit timeline, hashes, and anchors when enabled. | Pack is incomplete or hash/export failed. | Closure service and Evidence/Audit service. |

---

## 5. Role-Based Experience Model

### 5.1 Role contract

| Role | Main UI purpose | Must see | Must not do |
|---|---|---|---|
| SME Admin | Configure organization, users, workspaces, integrations, and operating policies. | Organization setup, users, roles, workspaces, integration status, audit-sensitive settings. | Override immutable audit events, contract versions, hash records, or reviewer decisions. |
| Procurement Officer | Build procurement records and evidence from source-to-pay activity. | Projects, buyer demand, suppliers, requisitions, RFQs, quotations, POs, receipts, invoices, evidence gaps. | Approve Shariah review, approve financial due diligence, edit submitted supplier quotation evidence after lock. |
| Approver | Approve procurement decisions according to approval matrix. | Requisition approval, award/PO approval, budget/risk summary, evidence impact. | Edit supplier quotations after submission or perform financier/Shariah review. |
| Supplier User | Respond to RFQs and submit delivery/invoice evidence. | RFQs, quotation status, PO acknowledgement, delivery evidence, invoice status, payment status. | View financier due diligence, Shariah review notes, or internal SME financial ledger unless explicitly shared. |
| Finance/Accountant | Maintain project ledger, cost/revenue evidence, payment status, and P/L records. | Project ledger, disbursements, revenue, allowable costs, buyer payments, ERP reconciliation, P/L statements. | Approve Shariah review or override financier decision. |
| Financier User | Review application, decide due diligence, approve financing, control disbursement, monitor exposure. | Opportunity economics, buyer/supplier risk, evidence checklist, due diligence, contract, disbursement, exposure, milestones, closure pack. | Edit SME procurement source records or Shariah reviewer opinion. |
| Shariah Reviewer | Review eligibility, contract terms, profit ratio, loss treatment, and compliance exceptions. | Eligibility checklist, goods/services, buyer/supplier restrictions, contract terms, profit ratio, loss treatment, allowed expenses. | Approve financial due diligence, edit procurement source records, or create disbursement. |
| Auditor | Verify evidence, audit trail, hash records, Fabric anchors, and closure packs. | Evidence packs, audit events, document versions, hashes, anchors, closure packs, verification results. | Modify workflow records, create reviewer decisions, or change integration status. |
| Developer/Integrator | Build and operate adapters, webhooks, Fabric, ERP, e-sign, finance API, and extension points. | Integration status, outbox events, reconciliation records, API clients, diagnostics. | Override business approvals or alter evidence payloads outside controlled admin/repair flows. |

### 5.2 Route visibility contract

| Route | SME Admin | Procurement Officer | Approver | Supplier User | Finance/Accountant | Financier User | Shariah Reviewer | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/graph/projects` | View | View/annotate | View | Scoped view | View | View scoped opportunity graph | View scoped compliance graph | View read-only |
| `/finance/opportunities` | View | Create/edit draft | View | No | View | View/invited | View limited | View read-only |
| `/finance/opportunities/new` | Create | Create | No | No | Support data | No | No | No |
| `/finance/applications/:applicationId` | View/admin support | Submit/respond gaps | View | No | Ledger support | Review/approve/contract | Review Shariah panel | View read-only |
| `/finance/applications/:applicationId/evidence` | View | Complete gaps | View | Limited evidence upload | Link cost/revenue evidence | Request gaps | View compliance evidence | View read-only |
| `/finance/applications/:applicationId/due-diligence` | View | Respond only | No | No | Support evidence | Decide | View read-only | View read-only |
| `/finance/applications/:applicationId/shariah-review` | View | Respond only | No | No | Support evidence | View | Decide | View read-only |
| `/finance/contracts` | View/admin support | View | No | No | View | Generate/sign status | View terms | View read-only |
| `/finance/ledgers` | View | View linked procurement | No | No | Create/update | Monitor | View allowed-expense impact | View read-only |
| `/finance/profit-loss` | View | View | No | No | Calculate | Review/approve closure path | Review loss/compliance impact | View read-only |
| `/finance/closures` | View | View | No | No | Support export | Create/export | View | Verify/export read-only |
| `/evidence/packs` | View | Create/export | View | Limited upload | Create/link evidence | View scoped | View scoped | Verify |
| `/audit/entity/:entityType/:entityId` | View | View own scope | View own actions | View own scope | View own scope | View scoped | View scoped | Verify all scoped |
| `/integrations` | Configure | View status | No | No | ERP reconciliation | Finance/e-sign status | No | View status |

Backend enforcement must not depend on frontend hiding. Each route and action must be guarded by organization context, workspace scope, role/permission, object ownership/visibility, and object state.

### 5.3 Permission naming baseline

| Capability | Proposed permission |
|---|---|
| Read finance application | `finance:application:read` |
| Create opportunity | `finance:opportunity:create` |
| Create application | `finance:application:create` |
| Submit application | `finance:application:submit` |
| Manage evidence checklist | `finance:evidence-checklist:update` |
| Record due diligence | `finance:due-diligence:decide` |
| Record Shariah review | `finance:shariah-review:decide` |
| Approve/reject application | `finance:application:decide` |
| Generate contract | `finance:contract:create` |
| Generate contract document/e-sign package | `finance:contract-document:create` |
| Mark contract signed | `finance:contract:execute` |
| Record disbursement | `finance:disbursement:create` |
| Record ledger entry | `finance:ledger-entry:create` |
| Calculate profit/loss | `finance:profit-loss:create` |
| Export closure pack | `finance:closure-pack:create` |
| Verify evidence/audit | `audit:evidence:verify` |

---

## 6. Screen Contract: Mudarabah Application Workspace

### 6.1 Basic Information

| Field | Value |
|---|---|
| Route | `/finance/applications/:applicationId` |
| Related subroutes | `/finance/applications/:applicationId/evidence`, `/finance/applications/:applicationId/due-diligence`, `/finance/applications/:applicationId/shariah-review` |
| Module | Mudarabah Finance |
| Primary roles | Procurement Officer, Financier User, Shariah Reviewer, Finance/Accountant |
| Supporting roles | SME Admin, Auditor |
| SRS mapping | `BR-02`, `BR-03`, `BR-04`, `BR-07`, `BR-08`, `FR-25` to `FR-42`, `FR-47` to `FR-50`, `IR-01` |
| SDD mapping | Mudarabah Finance, Procurement Core, Policy/Rule Engine, Evidence/Documents, Audit/Fabric, Integration Adapters, Graph/Canvas |
| Current implementation status | Skeletal finance workspace exists; role separation, final OIDC claims, Fabric/e-sign/finance integrations, and polished evidence export remain deferred |
| Target status | Implementation contract / Review |

---

### 6.2 Purpose

Provide one controlled workspace where a procurement opportunity is converted into a restricted mudarabah financing arrangement through evidence collection, due diligence, Shariah review, contract execution, disbursement, monitoring, profit/loss calculation, and closure.

This screen is the product hinge between procurement and finance. It must make clear which procurement evidence supports the application, who can act next, what state the application is in, what evidence is missing, and which material side effects were created.

---

### 6.3 Preconditions

```text
- User is authenticated through current session or future OAuth/OIDC claims.
- User has organization context.
- User is a member of the organization or invited workspace.
- User has permission to read the application.
- MudarabahApplication exists.
- MudarabahApplication belongs to the active organization or shared workspace.
- Linked ProcurementOpportunity exists.
- Linked Project exists.
- For reviewer actions, actorUserId resolves to an active membership with the required role.
```

---

### 6.4 Main panels

| Panel | Required contents | Primary data source |
|---|---|---|
| Application summary | ID, title, status, requested capital, currency, applicant, organization, submitted/approved/rejected timestamps, rejection reason | `GET /api/v1/applications/:applicationId` |
| Opportunity economics | project, buyer demand, expected revenue, estimated capital, expected profit, capital provider ratio, entrepreneur ratio, delivery timeline, risk assumptions | Application payload with linked opportunity/project |
| Procurement evidence timeline | requisition, RFQ, quotation, PO, receipt, invoice, payment, supplier profile, buyer demand document, evidence pack link | Application opportunity, evidence pack, audit entity timeline |
| Evidence checklist | checklist status, required code, label, item status, linked evidence item, completion timestamp, gap reason, waiver status when added | Application payload / evidence checklist endpoints |
| Due diligence decision | reviewer, status, risk rating, findings, conditions, notes, timestamp | Due diligence report list |
| Shariah review decision | reviewer, status, decision, opinion, eligible activity, profit ratio check, loss treatment, allowed expenses, notes | Shariah review list |
| Contract status | contract number, restricted use, document status, document version/hash, e-sign package status, signed timestamp | Contract list/document/outbox |
| Disbursement status | amount, currency, method/reference, controlled account/supplier/milestone classification, disbursed timestamp, finance API status | Disbursement list/outbox |
| Ledger and profit/loss | capital, revenue, costs, allowed expenses, net profit/loss, distribution, loss exception status | Ledger entries and P/L statements |
| Audit trail | event type, actor, timestamp, entity, correlation/idempotency key, outbox status, anchor status | Audit API and integration/outbox API |
| Action panel | user-visible actions, enabled/disabled reason, next state, destructive/reviewer decision confirmation | Permission service + application status |

---

### 6.5 State contract

#### 6.5.1 Mudarabah application lifecycle

```text
DRAFT
  → SUBMITTED
  → EVIDENCE_PENDING
  → DUE_DILIGENCE_IN_REVIEW
  → SHARIAH_IN_REVIEW
  → APPROVED
  → CONTRACT_PENDING_SIGNATURE
  → CONTRACT_EXECUTED
  → DISBURSED
  → MONITORING
  → PROFIT_LOSS_CALCULATED
  → CLOSED
```

Exception branches:

```text
DUE_DILIGENCE_IN_REVIEW → REJECTED
SHARIAH_IN_REVIEW → REJECTED
MONITORING → LOSS_EXCEPTION_IN_REVIEW
LOSS_EXCEPTION_IN_REVIEW → CLOSED
```

#### 6.5.2 Transition table

| Current state | Action | Actor | API | Next state | Blocked when |
|---|---|---|---|---|---|
| `DRAFT` | Submit application | Procurement Officer | `POST /api/v1/applications/:id/submit` | `SUBMITTED` | Missing organization context, unauthorized actor, application not draft, non-revenue opportunity, missing minimum terms. |
| `SUBMITTED` | Generate checklist | Procurement Officer / Financier User | `POST /api/v1/applications/:id/evidence-checklist` | `EVIDENCE_PENDING` or `DUE_DILIGENCE_IN_REVIEW` | Application not submitted, checklist already invalid, actor lacks role. |
| `EVIDENCE_PENDING` | Complete checklist item | Procurement Officer / Financier User | `POST /api/v1/evidence-checklists/:checklistItemId/complete-item` | Remains `EVIDENCE_PENDING` until all complete; then `DUE_DILIGENCE_IN_REVIEW` | Evidence item missing, actor lacks role, checklist item not in same organization. |
| `DUE_DILIGENCE_IN_REVIEW` | Record due diligence approval | Financier User | `POST /api/v1/applications/:id/due-diligence` | `SHARIAH_IN_REVIEW` | Checklist incomplete, actor not financier, missing risk/decision fields. |
| `DUE_DILIGENCE_IN_REVIEW` | Record due diligence rejection | Financier User | `POST /api/v1/applications/:id/due-diligence` or `POST /api/v1/applications/:id/reject` | `REJECTED` | Actor not financier, rejection reason missing. |
| `SHARIAH_IN_REVIEW` | Record Shariah approval | Shariah Reviewer | `POST /api/v1/applications/:id/shariah-review` | Remains review-complete until application approval; target may show `SHARIAH_APPROVED_PENDING_FINAL_APPROVAL` display state | Due diligence not approved, actor not Shariah reviewer, required compliance checks missing. |
| `SHARIAH_IN_REVIEW` | Record Shariah rejection | Shariah Reviewer | `POST /api/v1/applications/:id/shariah-review` or `POST /api/v1/applications/:id/reject` | `REJECTED` | Actor not Shariah reviewer, rejection reason/opinion missing. |
| `SHARIAH_IN_REVIEW` | Approve application | Financier User | `POST /api/v1/applications/:id/approve` | `APPROVED` | Due diligence missing, Shariah review missing, actor not financier. |
| `APPROVED` | Generate contract record | Financier User | `POST /api/v1/contracts` | `CONTRACT_PENDING_SIGNATURE` | Application not approved, actor not financier, contract terms incomplete. |
| `CONTRACT_PENDING_SIGNATURE` | Generate contract document/e-sign package | Financier User | `POST /api/v1/contracts/:contractId/generate-document` | Contract remains pending signature | Contract missing, actor not financier, document generation failure, e-sign adapter disabled. |
| `CONTRACT_PENDING_SIGNATURE` | Mark signed | Financier User | `POST /api/v1/contracts/:contractId/mark-signed` | `CONTRACT_EXECUTED` | Contract not generated, missing signatures, actor not financier. |
| `CONTRACT_EXECUTED` | Record disbursement | Financier User | `POST /api/v1/disbursements` | `DISBURSED` | Contract not executed, duplicate disbursement risk, amount invalid, actor not financier. |
| `DISBURSED` | Record ledger entry | Finance/Accountant | `POST /api/v1/project-ledgers/entries` | `MONITORING` | Actor lacks ledger permission, missing entry type/amount/date, application not disbursed. |
| `MONITORING` | Calculate profit/loss | Finance/Accountant | `POST /api/v1/profit-loss/statements` | `PROFIT_LOSS_CALCULATED` or loss exception display path | Missing revenue/cost evidence, ledger incomplete, invalid guaranteed return calculation. |
| `PROFIT_LOSS_CALCULATED` | Export closure pack | Auditor / Financier User | `POST /api/v1/closures` | `CLOSED` | P/L missing, closure evidence missing, hash/export failure, actor unauthorized. |

---

### 6.6 Data displayed

| UI area | Data source | Required fields |
|---|---|---|
| Header | Application API response | `id`, `status`, `organizationId`, `opportunityId`, `applicantUser`, `requestedCapital`, `currency`, `createdAt`, `updatedAt` |
| Economics card | Application + Opportunity | `expectedRevenue`, `estimatedCapital`, `expectedProfit`, `capitalProviderRatio`, `entrepreneurRatio`, `purpose`, `restrictedUse`, `riskAssumptions` |
| Role banner | Session / claims / membership API | active role, organization, workspace scope, visible actions, denied-action explanation |
| Evidence checklist | Application include / checklist endpoint | checklist `id`, `status`, item `requiredCode`, `label`, `status`, `evidenceItemId`, `completedAt`, `metadata` |
| Procurement evidence timeline | Evidence pack + procurement records + audit | evidence type, source entity, document version, hash status, linked PO/receipt/invoice, timestamps |
| Due diligence panel | Due diligence reports | reviewer, `status`, `riskRating`, `decision`, `notes`, conditions, createdAt |
| Shariah review panel | Shariah reviews | reviewer, `status`, `decision`, `opinion`, notes, createdAt |
| Contract panel | Contracts/documents/outbox | contract number, status, restricted use, documentId, documentVersionId, contentHash, signer, e-sign outbox state |
| Disbursement panel | Disbursements/outbox | amount, currency, reference, method, contractId, disbursedAt, external status |
| Ledger/P&L panel | Ledger + P/L endpoints | entry type, amount, occurredAt, revenue, costs, netProfit, distributions, loss exceptions |
| Closure panel | Closure pack endpoint | closure pack ID, evidence pack ID, summary, export status, hash status, anchor status |
| Audit panel | Audit/entity timeline endpoint | event type, actor, entity, timestamp, metadata, outbox/idempotency, anchor reference |

---

### 6.7 Allowed actions

| Action | Visible to role | Enabled when | API call | Next state / result |
|---|---|---|---|---|
| Submit application | Procurement Officer | `status = DRAFT` and minimum opportunity terms exist | `POST /api/v1/applications/:id/submit` | `SUBMITTED` |
| Generate evidence checklist | Procurement Officer, Financier User | `status = SUBMITTED` or `EVIDENCE_PENDING` | `POST /api/v1/applications/:id/evidence-checklist` | `EVIDENCE_PENDING` or `DUE_DILIGENCE_IN_REVIEW` |
| Complete evidence checklist item | Procurement Officer, Financier User | checklist item `status = PENDING` and evidence exists | `POST /api/v1/evidence-checklists/:itemId/complete-item` | item `COMPLETED`; maybe application `DUE_DILIGENCE_IN_REVIEW` |
| Record due diligence | Financier User | `status = DUE_DILIGENCE_IN_REVIEW` and checklist complete | `POST /api/v1/applications/:id/due-diligence` | `SHARIAH_IN_REVIEW` or `REJECTED` |
| Record Shariah review | Shariah Reviewer | `status = SHARIAH_IN_REVIEW` and due diligence approved | `POST /api/v1/applications/:id/shariah-review` | review record created; rejected application if not approved |
| Final approve application | Financier User | due diligence and Shariah review are approved | `POST /api/v1/applications/:id/approve` | `APPROVED` |
| Reject application | Financier User, Shariah Reviewer | application is in a reviewable state | `POST /api/v1/applications/:id/reject` | `REJECTED` |
| Generate contract | Financier User | `status = APPROVED` | `POST /api/v1/contracts` | `CONTRACT_PENDING_SIGNATURE` |
| Generate contract document | Financier User | contract exists and application approved | `POST /api/v1/contracts/:id/generate-document` | document/version/hash created; e-sign outbox queued |
| Mark contract signed | Financier User | contract pending signature and required signature evidence exists | `POST /api/v1/contracts/:id/mark-signed` | `CONTRACT_EXECUTED` |
| Record disbursement | Financier User | `status = CONTRACT_EXECUTED` and contract `EXECUTED` | `POST /api/v1/disbursements` | `DISBURSED` |
| Record ledger entry | Finance/Accountant | `status = DISBURSED`, `MONITORING`, or `PROFIT_LOSS_CALCULATED` | `POST /api/v1/project-ledgers/entries` | `MONITORING` |
| Calculate profit/loss | Finance/Accountant | `status = MONITORING` and ledger evidence complete | `POST /api/v1/profit-loss/statements` | `PROFIT_LOSS_CALCULATED` |
| Export closure pack | Auditor, Financier User | `status = PROFIT_LOSS_CALCULATED` | `POST /api/v1/closures` | `CLOSED` |
| View audit timeline | All authorized scoped roles; Auditor read-only | application exists and user has read scope | `GET /api/v1/audit-events/entity/MudarabahApplication/:id` | timeline displayed |
| Verify hash/Fabric anchor | Auditor | hash or anchor exists | `POST /api/v1/hash-records/:id/verify`, future Fabric verify endpoint | verification result recorded |

---

### 6.8 Validation rules

| Rule | Frontend behavior | Backend behavior |
|---|---|---|
| Required field missing | Show inline error, focus first invalid field, disable submit until minimally valid. | Return `400 VALIDATION_ERROR` with field errors. |
| Missing organization context | Show organization-context recovery state. | Return `400 MISSING_ORGANIZATION_CONTEXT`. |
| Unauthorized role | Hide primary action and show read-only explanation where route is visible. | Return `403 UNAUTHORIZED_ROLE` or `403 INSUFFICIENT_WORKSPACE_SCOPE`. |
| Invalid state transition | Disable action with state-specific reason. | Return `409 INVALID_STATE_TRANSITION`. Current code returns `400` in some places; target should normalize to `409`. |
| Missing evidence checklist | Show evidence checklist CTA if allowed; otherwise show gap. | Block due diligence with `409 EVIDENCE_CHECKLIST_REQUIRED`. |
| Checklist incomplete | Show evidence gap count and pending items. | Block due diligence with `409 EVIDENCE_CHECKLIST_INCOMPLETE`. |
| Due diligence missing | Show due diligence pending state. | Block Shariah/final approval/contract with `409 DUE_DILIGENCE_REQUIRED`. |
| Shariah review missing | Show Shariah pending state. | Block final approval/contract with `409 SHARIAH_REVIEW_REQUIRED`. |
| Contract not executed | Show contract signature status and pending e-sign state. | Block disbursement with `409 CONTRACT_EXECUTION_REQUIRED`. |
| Duplicate or invalid disbursement | Show duplicate-warning confirmation or disable action. | Enforce idempotency key and return `409 DUPLICATE_DISBURSEMENT` or `400 INVALID_AMOUNT`. |
| Profit/loss has missing ledger evidence | Show missing revenue/cost/evidence gap. | Return `409 LEDGER_EVIDENCE_INCOMPLETE`. |
| Guaranteed fixed return attempt | Show Shariah/profit-ratio validation error. | Return `400 GUARANTEED_RETURN_NOT_ALLOWED`. |
| Integration unavailable | Show pending/retrying badge and allow local workflow where permitted. | Create outbox event, return local success with integration status `PENDING`, or return retryable `503` only for synchronous mandatory integrations. |
| Hash mismatch | Show high-severity verification exception. | Return `409 HASH_MISMATCH` and create audit/exception record. |

---

### 6.9 API contract

All endpoints are under `/api/v1`.

| Method | Endpoint | Purpose | Required permission | Primary state effect |
|---|---|---|---|---|
| `GET` | `/applications/:id` | Load application workspace. | `finance:application:read` | None |
| `POST` | `/applications` | Create application from opportunity. | `finance:application:create` | creates `DRAFT` application |
| `POST` | `/applications/:id/submit` | Submit application. | `finance:application:submit` | `DRAFT → SUBMITTED` |
| `POST` | `/applications/:id/evidence-checklist` | Generate checklist. | `finance:evidence-checklist:update` | `SUBMITTED → EVIDENCE_PENDING` or `DUE_DILIGENCE_IN_REVIEW` |
| `POST` | `/evidence-checklists/:itemId/complete-item` | Complete checklist item. | `finance:evidence-checklist:update` | item `COMPLETED`; maybe application advances |
| `POST` | `/applications/:id/due-diligence` | Record financier due diligence decision. | `finance:due-diligence:decide` | `DUE_DILIGENCE_IN_REVIEW → SHARIAH_IN_REVIEW` or `REJECTED` |
| `POST` | `/applications/:id/shariah-review` | Record Shariah/compliance decision. | `finance:shariah-review:decide` | review recorded; may reject application |
| `POST` | `/applications/:id/approve` | Final approve application after both review gates. | `finance:application:decide` | `SHARIAH_IN_REVIEW → APPROVED` |
| `POST` | `/applications/:id/reject` | Reject application. | `finance:application:decide` | `REJECTED` |
| `POST` | `/contracts` | Create restricted mudarabah contract record. | `finance:contract:create` | `APPROVED → CONTRACT_PENDING_SIGNATURE` |
| `POST` | `/contracts/:id/generate-document` | Generate contract document and e-sign outbox request. | `finance:contract-document:create` | document/version/hash/outbox |
| `POST` | `/contracts/:id/mark-signed` | Mark contract executed after signature. | `finance:contract:execute` | `CONTRACT_PENDING_SIGNATURE → CONTRACT_EXECUTED` |
| `POST` | `/disbursements` | Record controlled disbursement. | `finance:disbursement:create` | `CONTRACT_EXECUTED → DISBURSED` |
| `GET` | `/project-ledgers/entries?organizationId=&applicationId=` | Load ledger entries. | `finance:ledger-entry:read` | None |
| `POST` | `/project-ledgers/entries` | Record ledger entry. | `finance:ledger-entry:create` | `DISBURSED → MONITORING` |
| `GET` | `/profit-loss/statements?organizationId=&applicationId=` | Load P/L statements. | `finance:profit-loss:read` | None |
| `POST` | `/profit-loss/statements` | Calculate profit/loss statement. | `finance:profit-loss:create` | `MONITORING → PROFIT_LOSS_CALCULATED` |
| `POST` | `/closures` | Export closure pack. | `finance:closure-pack:create` | `PROFIT_LOSS_CALCULATED → CLOSED` |
| `GET` | `/audit-events/entity/:entityType/:entityId` | Load entity audit timeline. | `audit:event:read` | None |
| `GET` | `/integrations/outbox?organizationId=` | Load integration/outbox status. | `integration:outbox:read` | None |

#### 6.9.1 Common request DTO

```json
{
  "actorUserId": "uuid",
  "organizationId": "uuid",
  "comment": "string"
}
```

#### 6.9.2 Create application DTO

```json
{
  "actorUserId": "uuid",
  "organizationId": "uuid",
  "opportunityId": "uuid",
  "applicantUserId": "uuid",
  "requestedCapital": 125000,
  "capitalProviderRatio": 0.6,
  "entrepreneurRatio": 0.4,
  "currency": "MYR",
  "purpose": "Restricted procurement working capital for buyer PO fulfillment"
}
```

#### 6.9.3 Decision DTO

```json
{
  "actorUserId": "uuid",
  "reviewerUserId": "uuid",
  "status": "APPROVED",
  "decision": "APPROVED",
  "riskRating": "MEDIUM",
  "opinion": "Restricted mudarabah structure reviewed for eligibility.",
  "notes": "Reviewer notes and conditions."
}
```

#### 6.9.4 Ledger entry DTO

```json
{
  "actorUserId": "uuid",
  "organizationId": "uuid",
  "applicationId": "uuid",
  "entryType": "REVENUE",
  "description": "Buyer payment received for project milestone 1",
  "amount": 80000,
  "currency": "MYR",
  "occurredAt": "2026-06-02T00:00:00.000Z"
}
```

#### 6.9.5 Success response pattern

```json
{
  "id": "uuid",
  "status": "APPROVED",
  "updatedAt": "2026-06-02T00:00:00.000Z",
  "auditEventId": "uuid",
  "outboxEventId": "uuid"
}
```

#### 6.9.6 Error response pattern

```json
{
  "error": "INVALID_STATE_TRANSITION",
  "message": "Application cannot be approved before Shariah review is approved.",
  "details": {
    "currentState": "DUE_DILIGENCE_IN_REVIEW",
    "requiredState": "SHARIAH_IN_REVIEW"
  }
}
```

---

### 6.10 Audit, evidence, and outbox side effects for this screen

| Action | Audit event | Evidence effect | Outbox / integration effect |
|---|---|---|---|
| Create opportunity | `PROCUREMENT_OPPORTUNITY_CREATED` | Links existing evidence pack or creates evidence gap. | Generic outbox event; graph refresh event recommended. |
| Create application | `MUDARABAH_APPLICATION_CREATED` | Application starts as finance evidence object. | Generic outbox event; financier notification recommended. |
| Submit application | `MUDARABAH_APPLICATION_SUBMITTED` | Submission snapshot should be lockable. | Generic outbox event; optional financier notification. |
| Generate checklist | `EVIDENCE_CHECKLIST_GENERATED` | Checklist and checklist items created from policy. | Generic outbox event. |
| Complete checklist item | `EVIDENCE_CHECKLIST_ITEM_COMPLETED` | Evidence item linked and item marked complete. | Generic outbox event. |
| Record due diligence | `DUE_DILIGENCE_RECORDED` | Due diligence decision and conditions stored. | Generic outbox event; optional Shariah task notification. |
| Record Shariah review | `SHARIAH_REVIEW_RECORDED` | Shariah opinion/checklist stored and should be locked. | Generic outbox event; optional financier task notification. |
| Approve application | `MUDARABAH_APPLICATION_APPROVED` | Approval evidence becomes part of contract-generation pack. | Generic outbox event. |
| Reject application | `MUDARABAH_APPLICATION_REJECTED` | Rejection reason stored. | Generic outbox event. |
| Create contract | `MUDARABAH_CONTRACT_CREATED` | Contract record created. | Generic outbox event. |
| Generate contract document | `MUDARABAH_CONTRACT_DOCUMENT_GENERATED` | `Document` and `DocumentVersion` created; content hash stored. | `ESIGNATURE_PACKAGE_REQUESTED` outbox event. |
| Mark contract signed | `MUDARABAH_CONTRACT_SIGNED` | Signed contract version should be locked. | Generic outbox event; future Fabric anchor candidate. |
| Record disbursement | `DISBURSEMENT_RECORDED` | Disbursement evidence linked to contract/application. | Generic outbox event; future finance API/payment notification. |
| Record ledger entry | `PROJECT_LEDGER_ENTRY_RECORDED` | Ledger entry becomes P/L evidence. | Generic outbox event; future ERP reconciliation event. |
| Calculate profit/loss | `PROFIT_LOSS_STATEMENT_CREATED` | Distribution or loss exception records created. | Generic outbox event. |
| Export closure pack | `CLOSURE_PACK_EXPORTED` | Closure pack created; pack hash and export artifact required. | Generic outbox event; future Fabric anchor request. |

---

### 6.11 UI states

| State | Required behavior |
|---|---|
| Loading | Show skeleton sections for header, state tracker, evidence checklist, review panels, and audit timeline. Preserve route and application ID. |
| Empty | Explain which parent record is missing. Example: no evidence checklist exists; show `Generate checklist` only for authorized roles. |
| Error | Show concise error, retry button, diagnostic code, and safe details. Do not expose confidential payloads. |
| Unauthorized | Show access denied with active organization and role; do not render broken panels or partial confidential data. |
| Invalid state | Show current state, required state, and why the action is unavailable. |
| External integration pending | Show pending/retrying/outbox state for e-sign, finance API, ERP, webhooks, or Fabric anchor. |
| Mock/deferred feature | Label clearly as `Mock` or `Deferred`; include the target integration name. |
| Success | Show transition result, updated status, audit event created, and next recommended action. |
| Partial evidence | Show evidence gap count, item-level status, and blocking impact. |
| Read-only auditor | Render all panels read-only with verification actions only. |

---

### 6.12 Acceptance criteria

```text
- Screen loads only for authenticated and authorized users.
- Screen respects organization context and workspace scope.
- Screen shows application, opportunity, evidence checklist, review decisions, contract, disbursement, ledger, P/L, closure, and audit state consistently.
- Procurement Officer can submit application and resolve evidence gaps but cannot approve due diligence or Shariah review.
- Financier User can record due diligence, approve/reject application, create contract, and record disbursement but cannot edit procurement source records or Shariah opinion.
- Shariah Reviewer can record Shariah decision but cannot approve due diligence, disbursement, or ledger entries.
- Finance/Accountant can maintain ledger and calculate P/L but cannot approve Shariah review.
- Auditor has read-only access plus verification actions.
- Contract cannot be generated before due diligence and Shariah review are approved.
- Disbursement cannot happen before contract execution.
- Profit/loss cannot be calculated before ledger monitoring evidence exists.
- Closure cannot happen before profit/loss calculation.
- Invalid actions are hidden or disabled in the frontend and rejected by the backend.
- Required audit events are created for every material transition.
- Required evidence or document side effects are created where required.
- Outbox events are created for asynchronous integration side effects.
- Empty, loading, error, unauthorized, invalid-state, pending-integration, mock/deferred, and success states are implemented.
- Screen has role-aware E2E coverage and API integration tests for blocked state transitions.
```

---

### 6.13 Implementation gaps identified from this contract

| Gap | Impact | Required task |
|---|---|---|
| Role-specific finance workspace tabs are not fully separated. | Users may see generic workflow instead of persona-specific tasks. | Add permission-aware tabs and route guards for evidence, due diligence, Shariah, contract, ledger, P/L, and closure panels. |
| Current local/dev session is not final OAuth/OIDC. | Claims and scopes are not production-grade. | Replace local-only actor/session handling with OIDC claims and backend guard enforcement. |
| Current backend role checks for ledger and P/L are narrower than target Finance/Accountant ownership. | Finance/Accountant role cannot own its intended ledger/P&L actions. | Add `FINANCE_ACCOUNTANT` role support and permissions for ledger and P/L endpoints. |
| Contract document generation is JSON/mock oriented. | Final reviewer-ready contract pack and e-sign lifecycle are incomplete. | Implement document template, PDF/JSON package, signature evidence, immutable versions, and e-sign reconciliation. |
| Fabric anchoring is not fully exposed in the finance workspace. | User cannot see pending/anchored/failed status in context. | Add anchor status panel sourced from `AuditAnchor`/outbox/integration endpoints. |
| Error responses need normalized codes. | Frontend cannot render consistent invalid-state messages. | Standardize API errors to `400 VALIDATION_ERROR`, `403`, `404`, `409`, and retryable `503` codes. |
| Waiver workflow is not yet defined. | Required evidence can only be completed, not formally waived. | Add authorized waiver records, waiver reason, reviewer role, audit event, and P/L/contract blocking rules. |

---

## 7. Evidence/Audit/Outbox Matrix

| Material action | Owning module | Audit event | Evidence item / document effect | Hash record | Outbox / integration effect | Anchor candidate |
|---|---|---|---|---|---|---|
| Organization created | Identity and Access | `ORGANIZATION_CREATED` | Organization setup evidence optional | No | None unless external IdP provisioning | No |
| User/role/membership changed | Identity and Access | `USER_CREATED`, `ROLE_CREATED`, `MEMBERSHIP_ASSIGNED`, `PERMISSION_CHANGED` | Admin change evidence optional | No | Optional notification/webhook | Yes for permission-sensitive events |
| Project created | Procurement | `PROJECT_CREATED` | Project record becomes graph node | No | Graph refresh outbox recommended | No |
| Requisition submitted | Procurement | `REQUISITION_SUBMITTED` | Requisition evidence item | Optional document hash | Generic outbox / ERP sync optional | Yes if cross-organization |
| Requisition approved/rejected | Procurement | `REQUISITION_APPROVED`, `REQUISITION_REJECTED` | Approval evidence item | Optional | Generic outbox | Yes |
| RFQ published | Procurement | `RFQ_PUBLISHED` | RFQ evidence item | Optional | Supplier notification/webhook | Yes if shared externally |
| Quotation submitted | Procurement / Supplier | `QUOTATION_SUBMITTED` | Quotation evidence item and document version | Yes when uploaded | Procurement notification/webhook | Yes |
| PO issued | Procurement | `PURCHASE_ORDER_ISSUED` | PO evidence item and document version | Yes when document exists | Supplier notification / ERP sync | Yes |
| Receipt/service confirmation recorded | Procurement | `RECEIPT_RECORDED` or `SERVICE_CONFIRMATION_RECORDED` | Delivery evidence item | Optional document hash | ERP sync optional | Yes |
| Supplier invoice submitted | Procurement / Supplier | `INVOICE_SUBMITTED` | Invoice evidence item/document version | Yes when uploaded | ERP/accounting sync | Yes |
| Payment record imported/recorded | Finance/Accounting | `PAYMENT_RECORDED` | Payment evidence item | Optional | ERP/bank reconciliation | Yes |
| Evidence pack generated | Evidence and Audit | `EVIDENCE_PACK_GENERATED` | Evidence pack created | Optional | None | No |
| Evidence pack exported | Evidence and Audit | `EVIDENCE_PACK_EXPORTED` | Export artifact created | Yes | Fabric anchor request recommended | Yes |
| Hash verified | Evidence and Audit | `HASH_VERIFIED` or `HASH_MISMATCH_DETECTED` | Verification result recorded | Uses existing hash | None or exception notification | Yes if mismatch |
| Procurement opportunity created | Mudarabah Finance | `PROCUREMENT_OPPORTUNITY_CREATED` | Opportunity links evidence pack and project | No | Generic outbox; graph refresh recommended | Yes if financier workspace is invited |
| Mudarabah application created | Mudarabah Finance | `MUDARABAH_APPLICATION_CREATED` | Application record begins finance evidence | No | Generic outbox | No |
| Mudarabah application submitted | Mudarabah Finance | `MUDARABAH_APPLICATION_SUBMITTED` | Submission snapshot should be lockable | Recommended | Financier notification | Yes |
| Evidence checklist generated | Mudarabah Finance / Policy | `EVIDENCE_CHECKLIST_GENERATED` | Checklist and items created | No | Generic outbox | No |
| Evidence checklist item completed | Mudarabah Finance / Evidence | `EVIDENCE_CHECKLIST_ITEM_COMPLETED` | Evidence item linked to checklist | Existing item hash if document-backed | Generic outbox | No unless cross-org evidence |
| Due diligence recorded | Mudarabah Finance | `DUE_DILIGENCE_RECORDED` | Due diligence report created | Recommended for signed report version | Shariah task notification if approved | Yes |
| Shariah review recorded | Mudarabah Finance | `SHARIAH_REVIEW_RECORDED` | Shariah review/opinion created and locked | Recommended | Financier task notification | Yes |
| Application approved | Mudarabah Finance | `MUDARABAH_APPLICATION_APPROVED` | Approval becomes contract-generation evidence | Recommended | Generic outbox | Yes |
| Application rejected | Mudarabah Finance | `MUDARABAH_APPLICATION_REJECTED` | Rejection reason stored | No | Generic outbox | Yes for final decision |
| Contract created | Mudarabah Finance | `MUDARABAH_CONTRACT_CREATED` | Contract record created | No | Generic outbox | No |
| Contract document generated | Evidence/Documents | `MUDARABAH_CONTRACT_DOCUMENT_GENERATED` | `Document` and `DocumentVersion` created | Yes | `ESIGNATURE_PACKAGE_REQUESTED` | Yes |
| Contract signed/executed | Mudarabah Finance / E-sign | `MUDARABAH_CONTRACT_SIGNED` | Signed document version locked | Yes | E-sign reconciliation/webhook | Yes |
| Disbursement recorded | Mudarabah Finance | `DISBURSEMENT_RECORDED` | Disbursement evidence linked | Optional | Finance API/payment outbox | Yes |
| Ledger entry recorded | Mudarabah Finance / Finance | `PROJECT_LEDGER_ENTRY_RECORDED` | Ledger evidence item created/linked | Optional | ERP sync/reconciliation outbox | Yes for material entries |
| Profit/loss statement created | Mudarabah Finance | `PROFIT_LOSS_STATEMENT_CREATED` | P/L statement, distribution or loss exception records | Recommended | Generic outbox | Yes |
| Loss exception classified | Mudarabah Finance / Shariah / Audit | `LOSS_EXCEPTION_CLASSIFIED` | Loss evidence and reviewer decision locked | Recommended | Notification to financier/SME | Yes |
| Closure pack exported | Mudarabah Finance / Evidence and Audit | `CLOSURE_PACK_EXPORTED` | Closure pack artifact, summary, document versions | Yes | Fabric anchor request | Yes |
| Fabric anchor requested | Integrations | `FABRIC_ANCHOR_REQUESTED` | Anchor request record | Uses existing hash | `FABRIC_ANCHOR_REQUESTED` outbox | Pending |
| Fabric anchor completed | Integrations | `FABRIC_ANCHOR_COMPLETED` | `AuditAnchor` / `FabricTransactionRef` stored | Uses existing hash | Webhook/status update optional | Complete |
| Fabric anchor failed/retrying | Integrations | `FABRIC_ANCHOR_FAILED`, `FABRIC_ANCHOR_RETRYING` | Retry state visible | Uses existing hash | Retry outbox with idempotency | Pending/failed |
| Closure pack verified | Audit | `CLOSURE_PACK_VERIFIED` or `CLOSURE_PACK_VERIFICATION_FAILED` | Verification finding stored | Uses pack hash | None unless exception notification | Complete or failed |

---

## 8. Definition of Ready

A screen is ready for implementation only when all items below are satisfied.

```text
[ ] Route is defined.
[ ] User role is defined.
[ ] Required permission is defined.
[ ] Required organization/workspace context is defined.
[ ] Domain object and lifecycle state are defined.
[ ] Data displayed is defined.
[ ] Empty/loading/error/unauthorized/invalid-state behavior is defined.
[ ] Allowed actions are defined.
[ ] Disabled-action reasons are defined.
[ ] API endpoints are defined.
[ ] Request DTOs are defined.
[ ] Success response DTOs are defined.
[ ] Error response DTOs and status codes are defined.
[ ] Frontend validation rules are defined.
[ ] Backend validation and state-transition guards are defined.
[ ] Audit events are defined or explicitly marked not required.
[ ] Evidence effects are defined or explicitly marked not required.
[ ] Document version/hash effects are defined where applicable.
[ ] Outbox/integration effects are defined or explicitly marked not required.
[ ] SRS mapping is defined.
[ ] SDD component mapping is defined.
[ ] Security/workspace-scope concerns are reviewed.
[ ] Accessibility expectations are defined for forms, tables, dialogs, and error states.
[ ] Acceptance criteria are defined.
[ ] Unit, integration, and E2E/UAT test expectations are defined.
```

### 8.1 Feature intake block to copy into issues

```md
Feature:
Owning module:
Supporting modules:
Route:
API endpoint:
Database entity:
Permission:
Audit event:
Outbox event:
Evidence effect:
SRS mapping:
SDD mapping:
Test requirement:
Acceptance criteria:
```

---

## 9. Definition of Done

A screen is done only when all implementation, verification, and documentation requirements below are satisfied.

```text
[ ] Frontend route exists.
[ ] Frontend data fetching is implemented with organization/workspace context.
[ ] Frontend permission-aware rendering is implemented.
[ ] Backend endpoint exists.
[ ] DTO validation exists.
[ ] Permission guard exists.
[ ] Workspace-scope and organization-scope enforcement exists.
[ ] Invalid state transitions are rejected by backend.
[ ] Required audit events are created.
[ ] Required evidence records are created.
[ ] Required document versions and hash records are created where applicable.
[ ] Required outbox events are created.
[ ] Integration pending/retrying/succeeded/failed states are visible where applicable.
[ ] Loading state works.
[ ] Empty state works.
[ ] Error state works.
[ ] Unauthorized state works.
[ ] Invalid-state message works.
[ ] Role-specific UI behavior works.
[ ] Accessibility checks pass for keyboard, focus, labels, errors, and contrast.
[ ] Unit tests pass.
[ ] Backend integration tests pass.
[ ] Frontend component or route tests pass where applicable.
[ ] E2E/UAT scenario passes for success path.
[ ] E2E/UAT scenario passes for unauthorized access.
[ ] E2E/UAT scenario passes for invalid state transition.
[ ] E2E/UAT scenario passes for missing evidence.
[ ] E2E/UAT scenario passes for integration pending/deferred state where applicable.
[ ] Audit verification test proves material action created the required event.
[ ] UI contract document is updated.
[ ] Roadmap/intake document is updated if scope changed.
[ ] OpenAPI documentation is updated.
```

---

## 10. Deferred Screen Contract Backlog

This first draft intentionally makes the Mudarabah Application Workspace implementation-ready before expanding every route. The next pass should add one full screen contract per route in this priority order:

1. `/graph/projects`
2. `/finance/opportunities`
3. `/finance/opportunities/new`
4. `/finance/applications/:applicationId/evidence`
5. `/finance/applications/:applicationId/due-diligence`
6. `/finance/applications/:applicationId/shariah-review`
7. `/finance/contracts`
8. `/finance/ledgers`
9. `/finance/profit-loss`
10. `/finance/closures`
11. `/evidence/packs`
12. `/audit/entity/:entityType/:entityId`
13. `/integrations`

For each route, reuse the contract sections in this file: basic information, purpose, preconditions, data displayed, allowed actions, validation rules, API contract, audit/evidence/outbox side effects, UI states, and acceptance criteria.



---

## 11. Full-Application Coverage Addendum

### 11.1 Status and scope upgrade

This addendum upgrades the UI contract from the first implementation-ready slice into a full application-level contract. It keeps the existing Mudarabah Application Workspace contract, then adds the missing pre-application, operational, administrative, integration, procurement, evidence, graph, reporting, and Kano delighter coverage.

| Item | Value |
|---|---|
| Addendum status | Draft / Review |
| Coverage target | All SRS use cases `UC-01` to `UC-15`, all primary implemented/specified routes, and all roadmap modules |
| Contract level | Product + UX + API + permission + state + evidence/audit/outbox + UAT |
| Principle | A route is not implementation-ready until it can be traced horizontally from SRS requirement to UI flow to SDD component |

### 11.2 Research basis

| Source | Contract facts extracted |
|---|---|
| `docs/requirements/mudarabah_eprocurement_srs.tex` | Stakeholder needs, business requirements, functional requirements, interface requirements, logical data requirements, non-functional constraints, and use cases `UC-01` to `UC-15`. |
| `docs/design/mepn_software_design_description.tex` | Modular monolith design, C4/component responsibilities, data model, API groups, security architecture, deployment architecture, reliability/backup/observability, ADR mapping. |
| `docs/ui/skeletal-web-ui-workflow.md` | Current skeletal UI states: dashboard, organization setup, procurement, evidence packs, audit, finance application, closure pack. |
| `docs/roadmap/module-roadmap.md` | Module ownership, routes, API areas, database entities, audit expectations, and test expectations. |
| `README.md` | Implemented stack, local run flow, frontend routes, endpoint inventory, finance lifecycle, graph/canvas behavior, integration/outbox behavior, UAT entry points. |
| `docs/technology-stack.md` | React/Vite, NestJS, PostgreSQL, Prisma, Redis/BullMQ, MinIO, OIDC, OpenAPI, React Flow, Caddy, Docker Compose, future Helm, observability, testing, security scanning. |
| `docs/deployment/azure-student-vm-deployment.md` | Azure Student VM runtime model, ports, tmux process model, env configuration, migrations, verification checklist, UAT seeding, backup/restore. |
| `apps/web/src/shared/api/endpoints.ts` | Current frontend API client routes and route-to-endpoint naming. |
| `apps/api/prisma/schema.prisma` | Hidden metadata and implementation assets available to UI: statuses, timestamps, attempts, nextRunAt, lastError, canonical hashes, document versions, audit events, integration reconciliation, webhook deliveries. |

---

## 12. Horizontal Traceability Matrix

This matrix follows the required traceability direction:

```text
SRS Functional Requirement / Use Case
  -> UI Contract / Flow Step
  -> SDD Technical Component
```

| SRS use case / requirement cluster | User goal | UI contract / flow step | Primary routes | API / backend contract | SDD technical component | Evidence / audit / outbox expectations | Coverage status |
|---|---|---|---|---|---|---|---|
| `UC-01`, `FR-01`, `FR-02`, `FR-03`, `NFR-10`, `NFR-19` | Install and configure SME node | Hosting readiness, first-run setup, health validation, backup enablement | `/operations/deployment-readiness`, `/operations/health`, `/org/setup`, `/admin/organization` | `GET /health`, `POST /orgs`, `PATCH /orgs/:id`, future backup/ops endpoints | Deployment Architecture, Observability/Ops, Identity and Access | `ORGANIZATION_CREATED`, `DEPLOYMENT_HEALTH_CHECKED`, backup status audit | Added in Sections 15-16 |
| `UC-02`, `FR-02`, `FR-03`, `FR-05`, `IR-02`, `IR-03`, `NFR-08`, `NFR-09` | Authenticate and reach correct role landing page | Login, OIDC callback, session establishment, org/context selection, no-access handling | `/login`, `/auth/callback`, `/auth/session-expired`, `/no-access`, `/dashboard` | `POST /auth/dev-login`, `GET /auth/session`, future OIDC callback/session endpoints | Identity and Access, Security Architecture | `USER_LOGIN_SUCCEEDED`, `USER_LOGIN_FAILED`, `ACCESS_DENIED`, permission audit | Added in Sections 15-16 |
| `UC-03`, `FR-19`, `FR-20`, `DR-08`, `NFR-16` | Onboard supplier with evidence and restrictions | Supplier profile, invitation, document checklist, risk/Shariah eligibility, approval/restriction | `/procurement/suppliers`, `/supplier/onboarding/:token`, `/evidence/documents` | `POST /suppliers`, `GET /suppliers`, document/evidence endpoints | Supplier/Counterparty, Evidence/Documents, Policy/Rule Engine | `SUPPLIER_CREATED`, `SUPPLIER_EVIDENCE_REQUESTED`, `SUPPLIER_RESTRICTED` | Added in Section 16 |
| `UC-04`, `FR-11`, `FR-12`, `FR-13`, `FR-23` | Run RFQ and evaluate quotations | RFQ creation, supplier invitations, quotation submission, comparison, award recommendation | `/procurement/rfqs`, `/supplier/rfqs`, `/procurement/quotations`, `/procurement/approvals` | `POST /rfqs`, `POST /rfqs/:id/publish`, `POST /quotations`, future award endpoints | Procurement Core, Supplier/Counterparty, Evidence/Documents | `RFQ_CREATED`, `RFQ_PUBLISHED`, `QUOTATION_RECEIVED`, `AWARD_RECOMMENDED` | Added in Section 16 |
| `UC-05`, `FR-09` to `FR-18`, `IR-05`, `IR-06` | Execute procure-to-pay with matching evidence | Requisition, approval, PO, receipt, invoice, three-way match, ERP reconciliation | `/procurement/requisitions`, `/procurement/approvals`, `/procurement/purchase-orders`, `/procurement/receipts`, `/procurement/invoices`, `/procurement/matching` | Requisition/RFQ/PO/receipt/invoice endpoints, future matching endpoint | Procurement Core, Integration Adapters, Audit/Fabric | `REQUISITION_SUBMITTED`, `REQUISITION_APPROVED`, `PURCHASE_ORDER_ISSUED`, `RECEIPT_RECORDED`, `INVOICE_RECORDED`, ERP outbox | Added in Section 16 |
| `UC-06`, `FR-25`, `FR-26`, `FR-27`, `FR-28` | Publish revenue-generating opportunity | Create opportunity from buyer demand/PO/contract and generate financing checklist | `/finance/opportunities`, `/finance/opportunities/new`, `/graph/projects` | `POST /opportunities`, `GET /opportunities`, evidence checklist endpoint after application | Mudarabah Finance, Evidence/Documents, Graph/Canvas | `PROCUREMENT_OPPORTUNITY_CREATED`, graph refresh, evidence link | Existing + expanded |
| `UC-07`, `FR-26`, `FR-28`, `FR-29`, `FR-41` | Apply for mudarabah capital | Application creation/submission, financier selection, restricted workspace, evidence gaps | `/finance/applications`, `/finance/applications/:id`, `/finance/applications/:id/evidence` | `POST /applications`, `POST /applications/:id/submit`, checklist endpoints | Mudarabah Finance, Policy/Rule Engine, Identity/Workspace | `MUDARABAH_APPLICATION_CREATED`, `MUDARABAH_APPLICATION_SUBMITTED`, financier notification | Existing + expanded |
| `UC-08`, `FR-29`, `FR-41`, `DR-07` | Perform financier due diligence | Review buyer/supplier/project economics, risk, policy conditions, decision | `/finance/applications/:id/due-diligence` | `POST /applications/:id/due-diligence` | Mudarabah Finance, Policy/Rule Engine, Evidence/Documents | `DUE_DILIGENCE_RECORDED`, decision evidence locked | Existing + expanded |
| `UC-09`, `FR-30`, `FR-31`, `FR-32` | Perform Shariah/compliance review | Eligibility, profit ratio, loss treatment, allowed expenses, amendment/rejection | `/finance/applications/:id/shariah-review` | `POST /applications/:id/shariah-review`, `POST /applications/:id/reject` | Mudarabah Finance, Policy/Rule Engine, Evidence/Documents | `SHARIAH_REVIEW_RECORDED`, opinion locked | Existing + expanded |
| `UC-10`, `FR-32`, `FR-33`, `FR-34`, `FR-47`, `FR-48`, `IR-10`, `IR-11` | Execute contract and disburse capital | Generate contract, document/e-sign package, mark signed, disburse, queue external side effects | `/finance/contracts`, `/finance/applications/:id`, `/integrations` | `POST /contracts`, `POST /contracts/:id/generate-document`, `POST /contracts/:id/mark-signed`, `POST /disbursements` | Evidence/Documents, Mudarabah Finance, Integration Adapters, Audit/Fabric | `MUDARABAH_CONTRACT_CREATED`, `MUDARABAH_CONTRACT_DOCUMENT_GENERATED`, `ESIGNATURE_PACKAGE_REQUESTED`, `DISBURSEMENT_RECORDED` | Existing + expanded |
| `UC-11`, `FR-35`, `FR-36`, `FR-40`, `FR-47`, `FR-49` | Monitor execution without taking over procurement | Milestone dashboard, ledger entries, variance/risk flags, pending anchors | `/finance/ledgers`, `/graph/projects`, `/integrations/outbox` | `POST /project-ledgers/entries`, `GET /integrations/outbox` | Mudarabah Finance, Integration Adapters, Graph/Canvas, Audit/Fabric | `PROJECT_LEDGER_ENTRY_RECORDED`, ERP outbox, Fabric anchor pending | Added in Section 16 |
| `UC-12`, `FR-35`, `FR-37`, `FR-38`, `FR-39`, `FR-42` | Calculate profit/loss and close project | P/L calculation, distribution, loss exception, closure export | `/finance/profit-loss`, `/finance/closures`, `/evidence/packs` | `POST /profit-loss/statements`, `POST /closures` | Mudarabah Finance, Evidence/Documents, Audit/Fabric | `PROFIT_LOSS_STATEMENT_CREATED`, `LOSS_EXCEPTION_CLASSIFIED`, `CLOSURE_PACK_EXPORTED` | Existing + expanded |
| `UC-13`, `FR-43`, `FR-44`, `FR-45`, `FR-46`, `BR-09` | Use supply-chain network canvas | Graph workspace, filtered authorized subgraph, risk/status overlays, entity navigation | `/graph/projects`, future `/graph/canvas/:workspaceId` | `GET /graph/projects/:projectId` | Graph/Canvas, Identity/Access, Evidence/Audit | `CANVAS_VIEW_OPENED`, `GRAPH_ANNOTATION_CREATED`, graph export audit where applicable | Added in Section 16 |
| `UC-14`, `FR-47`, `FR-48`, `FR-50`, `BR-08`, `NFR-23` | Verify evidence and audit events | Entity timeline, evidence pack, hash verify, Fabric anchor verify/fallback | `/audit`, `/audit/search`, `/audit/entity/:entityType/:entityId`, `/evidence/hashes`, `/evidence/packs` | audit events, hash verify, evidence export, integration/fabric endpoints | Audit/Fabric, Evidence/Documents, Integration Adapters | `HASH_VERIFIED`, `HASH_MISMATCH_DETECTED`, `FABRIC_ANCHOR_COMPLETED`, closure verification record | Added in Section 16 |
| `UC-15`, `IR-05`, `IR-06`, `IR-07`, `IR-12`, `NFR-11` | Integrate ERP/accounting and external subscribers | ERP sync, CSV/XLSX fallback, webhook subscriptions, reconciliation, retry visibility | `/integrations`, `/integrations/outbox`, `/integrations/reconciliation` | integration endpoints, outbox/reconciliation endpoints | Integration Adapters, Outbox, Observability/Ops | `ERP_SYNC_REQUESTED`, `WEBHOOK_DELIVERY_REQUESTED`, reconciliation records | Added in Section 16 |

---

## 13. Full Navigation, Sitemap, and Entry Rules

### 13.1 Navigation hierarchy

```text
Public / Bootstrap
  /login
  /auth/callback
  /auth/session-expired
  /invite/:token
  /no-access

Home
  /dashboard

Graph / Canvas Cockpit
  /graph/projects
  /graph/canvas/:workspaceId          [planned]

Opportunity Workspace
  /finance/opportunities
  /finance/opportunities/new
  /finance/applications
  /finance/applications/:applicationId
  /finance/applications/:applicationId/evidence
  /finance/applications/:applicationId/due-diligence
  /finance/applications/:applicationId/shariah-review

Procurement
  /procurement/projects
  /procurement/suppliers
  /procurement/requisitions
  /procurement/requisitions/new
  /procurement/approvals
  /procurement/rfqs
  /procurement/quotations
  /procurement/purchase-orders
  /procurement/receipts
  /procurement/invoices
  /procurement/matching

Supplier Portal
  /supplier/onboarding/:token         [planned]
  /supplier/rfqs                      [planned]
  /supplier/quotations                [planned]
  /supplier/purchase-orders           [planned]
  /supplier/invoices                  [planned]

Evidence and Audit
  /evidence/documents
  /evidence/items
  /evidence/packs
  /evidence/hashes
  /evidence/timeline
  /audit
  /audit/search
  /audit/entity/:entityType/:entityId

Finance
  /finance/contracts
  /finance/ledgers
  /finance/profit-loss
  /finance/closures

Integrations
  /integrations
  /integrations/outbox                [planned if split from /integrations]
  /integrations/reconciliation        [planned if split from /integrations]
  /integrations/webhooks              [planned]

Administration
  /org/setup
  /admin/organization                 [planned]
  /admin/users
  /admin/roles
  /admin/invitations                  [planned]
  /admin/settings                     [planned]
  /admin/feature-flags                [planned]
  /admin/data-residency               [planned]

Operations and Hosting
  /operations/health                  [planned]
  /operations/jobs                    [planned]
  /operations/backups                 [planned]
  /operations/deployment-readiness    [planned]
  /operations/hosting                 [planned]

Reports
  /reports                            [planned]
  /reports/procurement                [planned]
  /reports/finance                    [planned]
  /reports/audit                      [planned]
```

### 13.2 Landing rules by user state

| User/session state | Landing route | Rule |
|---|---|---|
| Anonymous, no valid session | `/login` | Preserve intended route as `returnTo`. |
| OIDC callback in progress | `/auth/callback` | Show callback progress, validate `state` and nonce, then fetch session. |
| Authenticated but no organization | `/org/setup` or `/invite/:token` | User must create organization or accept invite before seeing business records. |
| Authenticated but no role | `/no-access` | Show organization, email, missing role reason, support contact, and audit access denial. |
| SME Admin | `/dashboard` with setup health cards | Highlight org setup, user/role gaps, integration readiness, backup freshness. |
| Procurement Officer | `/graph/projects` or `/procurement/requisitions` | Show next procurement/evidence tasks. |
| Supplier User | `/supplier/rfqs` | Show open RFQs, pending delivery/invoice evidence, payment status. |
| Financier User | `/finance/applications` | Show application queue, due diligence tasks, exposure/risk indicators. |
| Shariah Reviewer | `/finance/applications` filtered to Shariah tasks | Show pending eligibility/contract reviews. |
| Finance/Accountant | `/finance/ledgers` | Show cost/revenue gaps, ERP reconciliation, P/L tasks. |
| Auditor | `/audit/search` or `/evidence/packs` | Show verification queue and closure packs. |
| Developer/Integrator | `/integrations` or `/operations/health` | Show outbox, reconciliation, workers, environment health. |

### 13.3 Global UI shell contract

| UI shell element | Required behavior |
|---|---|
| Organization switcher | Shows active organization, deployment mode, role, workspace scope; switching invalidates cached route data. |
| Role/task banner | Displays what the current role can do on this route and why disabled actions are blocked. |
| Evidence badge | Shows evidence completeness where the route is tied to financing, audit, or procurement approvals. |
| Integration badge | Shows pending/retrying/failed outbox count for current organization. |
| Audit drawer | Available on material entity pages; opens contextual entity timeline without leaving workflow. |
| Search/command palette | Planned delighter: quick navigate to entity, document, application, supplier, audit event, or outbox event. |
| Accessibility | Keyboard navigation, focus restoration after dialog/action, labelled form fields, WCAG AA contrast, semantic headings. |

---

## 14. Domain State Machines

### 14.1 Deployment and environment readiness

```text
NOT_INSTALLED
  -> INFRA_CONFIGURED
  -> INFRA_RUNNING
  -> MIGRATIONS_APPLIED
  -> APP_PROCESSES_RUNNING
  -> HEALTHY
  -> DEGRADED
  -> MAINTENANCE
```

| State | UI indicator | Allowed action | Blocked when | Audit / ops effect |
|---|---|---|---|---|
| `NOT_INSTALLED` | Setup checklist empty | Show runbook checklist | No environment data | None |
| `INFRA_CONFIGURED` | Env file configured | Start infra | Missing secrets / database URL | `DEPLOYMENT_CONFIG_VALIDATED` |
| `INFRA_RUNNING` | PostgreSQL/Redis/MinIO reachable | Run migrations/build | Container unavailable | `DEPLOYMENT_HEALTH_CHECKED` |
| `MIGRATIONS_APPLIED` | Prisma migration status ok | Start API/web/worker | Migration drift | `MIGRATION_STATUS_CHECKED` |
| `APP_PROCESSES_RUNNING` | API/web/worker up | Run health checks | Worker missing | `PROCESS_HEALTH_CHECKED` |
| `HEALTHY` | Green health | Enable UAT/demo | None | Health event optional |
| `DEGRADED` | Yellow/red health | Retry, inspect logs, queue repair | Critical DB unreachable | `DEPLOYMENT_DEGRADED` |
| `MAINTENANCE` | Maintenance banner | Backup/restore/migration | Active critical workflow if not allowed | `MAINTENANCE_STARTED` |

### 14.2 Authentication/session lifecycle

```text
ANONYMOUS
  -> AUTHENTICATING
  -> CALLBACK_VALIDATING
  -> AUTHENTICATED_NO_ORG
  -> AUTHENTICATED_WITH_ORG
  -> AUTHORIZED
  -> SESSION_EXPIRED
  -> LOGGED_OUT
```

Exception branches:

```text
CALLBACK_VALIDATING -> TOKEN_INVALID
AUTHENTICATED_WITH_ORG -> NO_ROLE
AUTHORIZED -> ACCESS_DENIED_FOR_ROUTE
```

| Transition | Actor | UI action/API | Backend guard | Audit event |
|---|---|---|---|---|
| Anonymous to authenticating | Any user | Click login / dev login | IdP/dev auth enabled | `LOGIN_STARTED` |
| Callback validation | System | OIDC callback / `GET /auth/session` | issuer, audience, expiry, signature, nonce, scopes | `LOGIN_SUCCEEDED` or `LOGIN_FAILED` |
| Select org context | User/System | Organization switcher | membership active | `ORG_CONTEXT_SELECTED` |
| Route authorization | System | route loader/API guard | role, permission, workspace, object ownership | `ACCESS_GRANTED` or `ACCESS_DENIED` |
| Session expiry | System | session refresh fails | expired token/session | `SESSION_EXPIRED` |

### 14.3 Organization, membership, and invitation lifecycle

```text
Organization: DRAFT -> ACTIVE -> MAINTENANCE -> SUSPENDED -> ARCHIVED
Invitation: PENDING -> ACCEPTED | EXPIRED | REVOKED
Membership: ACTIVE -> SUSPENDED -> REMOVED
Role: DRAFT -> ACTIVE -> DEPRECATED
```

| Object | Material actions | Required side effects |
|---|---|---|
| Organization | create, update legal profile, update deployment mode, configure data residency | `ORGANIZATION_CREATED`, `ORGANIZATION_UPDATED`, `DATA_RESIDENCY_UPDATED` |
| Invitation | create, resend, accept, expire, revoke | `INVITATION_CREATED`, `INVITATION_ACCEPTED`, `INVITATION_REVOKED` |
| Membership | assign role, suspend, remove | `MEMBERSHIP_ASSIGNED`, `MEMBERSHIP_SUSPENDED`, `MEMBERSHIP_REMOVED` |
| Role/permission | create role, attach permission, remove permission | `ROLE_CREATED`, `PERMISSION_GRANTED`, `PERMISSION_REVOKED` |

### 14.4 Supplier lifecycle

```text
DRAFT
  -> INVITED
  -> DOCUMENTS_PENDING
  -> UNDER_REVIEW
  -> APPROVED
  -> RESTRICTED
  -> BLOCKED
  -> ARCHIVED
```

| State | Allowed actor | Blocked when | UI must show |
|---|---|---|---|
| `DRAFT` | Procurement Officer | Missing name/identity | Basic supplier profile form |
| `INVITED` | Procurement Officer / Supplier | Invite expired | Invite status and resend action |
| `DOCUMENTS_PENDING` | Supplier User | Required registration, bank, tax, certification, or Shariah documents missing | Completion meter and exact gaps |
| `UNDER_REVIEW` | Procurement Officer / Shariah Reviewer | Submitted docs incomplete | Review queue, risk flags |
| `APPROVED` | Procurement Officer | None | Supplier available for RFQ/PO |
| `RESTRICTED` | Shariah Reviewer / Admin | Eligibility unresolved or restricted goods/services | Restriction reason and allowed categories |
| `BLOCKED` | Admin / Finance | Bank/tax/risk mismatch | Payment/procurement block reason |

### 14.5 Procurement object lifecycles

| Object | Lifecycle | Material audit events |
|---|---|---|
| Project | `ACTIVE -> ON_HOLD -> CLOSED -> ARCHIVED` | `PROJECT_CREATED`, `PROJECT_STATUS_CHANGED` |
| Requisition | `DRAFT -> SUBMITTED -> APPROVED -> SOURCING -> AWARDED -> PO_ISSUED -> RECEIVED -> INVOICED -> CLOSED`; exceptions `SUBMITTED -> REJECTED`, `DRAFT/APPROVED -> CANCELLED` | `REQUISITION_CREATED`, `REQUISITION_SUBMITTED`, `REQUISITION_APPROVED`, `REQUISITION_REJECTED` |
| RFQ | `DRAFT -> PUBLISHED -> QUOTATION_RECEIVING -> CLOSED`; exceptions `DRAFT/PUBLISHED -> CANCELLED`, `PUBLISHED -> EXPIRED` | `RFQ_CREATED`, `RFQ_PUBLISHED`, `RFQ_CLOSED` |
| Quotation | `RECEIVED -> UNDER_EVALUATION -> SELECTED | REJECTED | EXPIRED` | `QUOTATION_RECEIVED`, `QUOTATION_SELECTED`, `QUOTATION_REJECTED` |
| Purchase Order | `DRAFT -> ISSUED -> ACKNOWLEDGED -> PARTIALLY_RECEIVED -> RECEIVED -> BILLED -> CLOSED`; exceptions `DRAFT/ISSUED -> CANCELLED` | `PURCHASE_ORDER_CREATED`, `PURCHASE_ORDER_ISSUED`, `PO_ACKNOWLEDGED`, `PO_CLOSED` |
| Receipt | `RECORDED -> ACCEPTED | EXCEPTION_RECORDED` | `RECEIPT_RECORDED`, `RECEIPT_EXCEPTION_RECORDED` |
| Invoice | `RECORDED -> MATCH_PENDING -> MATCHED -> PAYMENT_APPROVED -> POSTED`; exceptions `MATCH_EXCEPTION`, `DUPLICATE_SUSPECTED`, `REJECTED` | `INVOICE_RECORDED`, `THREE_WAY_MATCH_COMPLETED`, `MATCH_EXCEPTION_RAISED` |

### 14.6 Evidence, audit, and integration lifecycles

| Object | Lifecycle | Required UI behavior |
|---|---|---|
| Document | `ACTIVE -> LOCKED -> SUPERSEDED -> ARCHIVED` | Show immutable version history and linked entity. |
| DocumentVersion | `CREATED -> HASHED -> LOCKED -> VERIFIED | MISMATCH` | Show hash, file metadata, creator, timestamp. |
| EvidencePack | `DRAFT -> GENERATED -> HASHED -> EXPORTED -> ANCHOR_PENDING -> ANCHORED`; failure `ANCHOR_PENDING -> ANCHOR_FAILED -> ANCHOR_RETRYING` | Show pack contents, export artifact, hash and anchor status. |
| HashRecord | `CREATED -> VERIFIED | MISMATCH` | Verify locally even when Fabric is unavailable. |
| AuditAnchor | `PENDING -> ANCHORED_MOCK | ANCHORED | FAILED -> RETRYING` | Show pending anchor clearly without blocking local procurement. |
| OutboxEvent | `PENDING -> PROCESSING -> COMPLETED`; failure `FAILED -> RETRYING -> COMPLETED | DEAD_LETTERED` | Show attempts, next run, last error, and idempotency key. |
| IntegrationReconciliationRecord | `PENDING -> SENT -> ACKNOWLEDGED -> RECONCILED`; failure `FAILED -> MANUAL_REVIEW` | Link external reference and response payload where safe. |

### 14.7 Mudarabah finance lifecycles

| Object | Lifecycle | Critical guard |
|---|---|---|
| ProcurementOpportunity | `OPEN -> APPLICATION_DRAFTED -> SUBMITTED_FOR_FINANCE -> FINANCED -> CLOSED`; exceptions `INELIGIBLE`, `WITHDRAWN` | Must be revenue-generating and linked to buyer demand or equivalent evidence. |
| MudarabahApplication | `DRAFT -> SUBMITTED -> EVIDENCE_PENDING -> DUE_DILIGENCE_IN_REVIEW -> SHARIAH_IN_REVIEW -> APPROVED -> CONTRACT_PENDING_SIGNATURE -> CONTRACT_EXECUTED -> DISBURSED -> MONITORING -> PROFIT_LOSS_CALCULATED -> CLOSED`; exceptions `REJECTED`, `LOSS_EXCEPTION_IN_REVIEW` | Contract cannot be generated before approved due diligence and approved Shariah review. |
| EvidenceChecklist | `PENDING -> PARTIAL -> COMPLETED -> WAIVED_BY_AUTHORIZED_REVIEWER` | Due diligence blocked unless completed or formally waived. |
| DueDiligenceReport | `PENDING -> APPROVED | REJECTED | CHANGES_REQUESTED` | Shariah review blocked until approved. |
| ShariahReview | `PENDING -> APPROVED | REJECTED | AMENDMENT_REQUIRED` | Application approval blocked until approved. |
| MudarabahContract | `PENDING_SIGNATURE -> DOCUMENT_GENERATED -> SIGNING_REQUESTED -> EXECUTED -> AMENDED`; exception `VOIDED` | Executed terms immutable except through amendment. |
| Disbursement | `PENDING -> RECORDED -> RECONCILED`; exceptions `FAILED`, `REVERSED` | Requires executed contract. |
| ProjectLedgerEntry | `DRAFT -> RECORDED -> RECONCILED -> LOCKED`; exception `DISPUTED` | P/L should use reconciled or accepted evidence. |
| ProfitLossStatement | `CALCULATED -> REVIEWED -> DISTRIBUTED | LOSS_EXCEPTION_IN_REVIEW -> CLOSED` | No guaranteed fixed return; profit distributed by approved ratio. |
| LossException | `OPEN -> CLASSIFIED_BUSINESS_LOSS | CLASSIFIED_BREACH | RESOLVED` | Must distinguish genuine loss from negligence/fraud/breach. |
| ClosurePack | `EXPORTED -> HASHED -> ANCHOR_PENDING -> ANCHORED -> VERIFIED`; exception `VERIFICATION_FAILED` | Must contain contract, approvals, procurement evidence, ledger, P/L, distribution/loss decision, and audit timeline. |

---

## 15. Shared Screen Contract Rules

### 15.1 Common preconditions for protected routes

```text
- User has a valid local/dev session or future OIDC-authenticated session.
- User has active organization context.
- User has an active Membership for that organization or an invitation-scoped workspace grant.
- User role maps to at least one permission required by the route.
- API calls include organization context; future production APIs derive actor from token claims, not from arbitrary actorUserId request bodies.
- Backend checks organization ownership, workspace scope, object state, and permission before returning sensitive data.
```

### 15.2 Common data fields surfaced across entity screens

| Field family | Reason to display |
|---|---|
| `status`, `createdAt`, `updatedAt`, lifecycle timestamps | Reduces user uncertainty and supports auditability. |
| `organizationId`, active organization name, deployment mode | Prevents accidental work in wrong organization/tenant. |
| `actorUserId`, reviewer, requester, creator display names | Supports accountability without exposing unnecessary personal data. |
| `linkedEntityType`, `linkedEntityId`, document/evidence references | Enables one-click traceability across procurement, finance, evidence, and audit. |
| `contentHash`, `canonicalHash`, `verifiedAt` | Supports tamper-evident verification in the UI. |
| `outbox.status`, `attempts`, `nextRunAt`, `lastError`, `idempotencyKey` | Turns integration delays into visible, recoverable states. |
| `IntegrationReconciliationRecord.externalReference`, `status`, `responsePayload` | Gives integrators and auditors a safe explanation of external-system state. |

### 15.3 Common error response taxonomy

| HTTP status | Error code | Required UI behavior |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Show inline field errors and focus first invalid control. |
| 400 | `MISSING_ORGANIZATION_CONTEXT` | Show organization-context recovery action. |
| 401 | `AUTHENTICATION_REQUIRED` | Redirect to login with `returnTo`. |
| 401 | `SESSION_EXPIRED` | Show session-expired screen and preserve unsaved draft where safe. |
| 403 | `INSUFFICIENT_PERMISSION` | Show read-only explanation; do not expose forbidden data. |
| 403 | `INSUFFICIENT_WORKSPACE_SCOPE` | Explain that the record is outside current workspace. |
| 404 | `NOT_FOUND` | Show safe missing-record page. Do not reveal whether record exists in another org. |
| 409 | `INVALID_STATE_TRANSITION` | Explain current state, required state, and next valid action. |
| 409 | `EVIDENCE_INCOMPLETE` | Show evidence gap resolver. |
| 409 | `CONTRACT_EXECUTION_REQUIRED` | Link to contract status panel. |
| 409 | `HASH_MISMATCH` | Show high-severity audit exception and require reviewer action. |
| 422 | `BUSINESS_RULE_FAILED` | Show rule name and remediation. |
| 503 | `INTEGRATION_TEMPORARILY_UNAVAILABLE` | Show queued/retry status where workflow can continue. |

### 15.4 Common side-effect rule

A UI action is material when it changes lifecycle state, creates a record used as evidence, changes access rights, changes integration behavior, changes deployment/security posture, or affects profit/loss. Every material action must declare:

```text
AuditEvent? yes/no
EvidenceItem? yes/no
DocumentVersion? yes/no
HashRecord? yes/no
OutboxEvent? yes/no
IntegrationReconciliationRecord? yes/no
Fabric anchor candidate? yes/no
```

---

## 16. Full Screen Contracts

### 16.1 Application Hosting and Deployment Readiness

| Field | Value |
|---|---|
| Routes | `/operations/hosting`, `/operations/deployment-readiness`, `/operations/health` |
| Module | Operations |
| Primary role | SME Admin, Developer/Integrator |
| Supporting roles | Auditor read-only, Supervisor/demo reviewer read-only |
| SRS mapping | `UC-01`, `BR-05`, `NFR-10`, `NFR-13`, `NFR-19`, `NFR-20`, `NFR-21`, `NFR-22` |
| SDD mapping | Deployment Architecture, Observability/Ops, Reliability/DR, Security Architecture |
| Status | Planned UI contract; operational data partly available through `/health` and deployment runbook |

Purpose:

```text
Give SME administrators and implementers a single UI surface to verify that the self-hosted or managed node is deployable, healthy, backed up, and safe for UAT/demo or production-like use.
```

Required panels:

| Panel | Data displayed | Source |
|---|---|---|
| Runtime topology | web, API, worker, PostgreSQL, Redis, MinIO, reverse proxy/TLS status | `/health`, future ops endpoints, deployment config |
| Environment readiness | env file status, required variables, secrets policy, deployment mode, data residency | future `/operations/readiness` |
| Database migration status | Prisma migration version, drift warning, last migration time | future backend ops endpoint |
| Process status | API/web/worker running, version, commit SHA, build timestamp | future ops endpoint |
| Network exposure | public ports, TLS/proxy status, unsafe temporary-port warning | future ops endpoint / admin checklist |
| Backup status | last backup time, RPO countdown, restore test status | future backup endpoint |
| UAT seed state | whether demo/UAT seed ran, demo organization, reviewer start URLs | `seed:uat` output, future import endpoint |

Allowed actions:

| Action | Role | API / action | Side effect |
|---|---|---|---|
| Run health check | SME Admin, Developer/Integrator | `GET /api/v1/health` | optional `DEPLOYMENT_HEALTH_CHECKED` audit event |
| Validate environment | Developer/Integrator | future `POST /operations/readiness/check` | readiness record and audit event |
| Mark demo ready | SME Admin | future `POST /operations/demo-ready` | `DEMO_READY_CONFIRMED` |
| Record backup performed | SME Admin / Developer | future `POST /operations/backups` | `BACKUP_RECORDED`; backup evidence item optional |
| Enter maintenance mode | SME Admin | future `POST /operations/maintenance/start` | `MAINTENANCE_STARTED` |

Validation and fallbacks:

| Condition | Required behavior |
|---|---|
| API healthy but worker down | Allow local read/write where safe; show integration/outbox processing paused. |
| Database unavailable | Show critical outage; disable business actions. |
| Redis unavailable | Show queue/cache degraded; allow reads, block or warn async-heavy actions. |
| MinIO unavailable | Allow non-document reads; block uploads/exports with recovery explanation. |
| No TLS / temporary public ports | Show prototype-risk banner and reverse-proxy checklist. |
| Backup older than RPO | Show backup overdue warning and block production-readiness confirmation. |

Acceptance criteria:

```text
- Health page exposes API, database, Redis, worker, object storage, and integration queue status.
- Deployment readiness explains every red/yellow status and next remediation step.
- A non-technical SME Admin can tell whether the node is ready for demo/UAT.
- Temporary student deployment risks are visible and not hidden behind green app health.
- Backup freshness and restore-readiness are visible before production-like use.
```

### 16.2 Registration, Invitation, and First-Run Organization Setup

| Field | Value |
|---|---|
| Routes | `/org/setup`, `/invite/:token`, `/admin/invitations`, `/admin/organization` |
| Module | Identity and Access / Administration |
| Primary role | SME Admin |
| Supporting roles | Invited user, Supplier User, Financier User, Shariah Reviewer, Auditor |
| SRS mapping | `UC-01`, `UC-02`, `FR-01`, `FR-03`, `FR-05`, `FR-06`, `FR-07`, `NFR-07`, `NFR-16`, `NFR-21` |
| SDD mapping | Identity and Access, Security Architecture, Data Model |
| Status | `/org/setup` skeletal; invitation/admin extension planned |

Purpose:

```text
Create the organization, first administrator, default workspace, initial roles, and invite flow needed before procurement or finance records can exist.
```

Main flow:

```text
Open /org/setup
  -> enter legal organization profile
  -> create bootstrap admin user
  -> create default admin role and membership
  -> create default workspace
  -> record audit event
  -> run health/context check
  -> land on /dashboard
```

Invite flow:

```text
Admin creates invitation
  -> invited user opens /invite/:token
  -> token is validated
  -> user authenticates or creates local/dev identity
  -> system binds user to organization/workspace role
  -> user lands on role-specific task page
```

Required data:

| UI area | Fields |
|---|---|
| Organization profile | legal name, registration number, tax identifier, Shariah profile, deployment mode, contact point |
| Admin user | display name, email, bootstrap auth method, role |
| Invitation | email, role, workspace, expiry, invitedBy, status, acceptedAt |
| Workspace | name, type, status, bounded opportunity/project scope |

Side effects:

| Action | Audit event | Evidence/outbox |
|---|---|---|
| Create organization | `ORGANIZATION_CREATED` | Organization setup evidence optional |
| Update organization profile | `ORGANIZATION_UPDATED` | Versioned profile snapshot recommended |
| Create invitation | `INVITATION_CREATED` | email/webhook outbox optional |
| Accept invitation | `INVITATION_ACCEPTED`, `MEMBERSHIP_ASSIGNED` | workspace access created |
| Revoke invitation | `INVITATION_REVOKED` | none |

Acceptance criteria:

```text
- First-run setup cannot create business records without organization context.
- The first admin can immediately see organization, role, workspace, and health status.
- Invitation acceptance cannot grant access if token is expired, revoked, or scoped to another organization.
- Supplier/financier/auditor invited users land on their scoped screens, not the full SME admin dashboard.
```

### 16.3 Authentication, Session, and Authorization

| Field | Value |
|---|---|
| Routes | `/login`, `/auth/callback`, `/auth/session-expired`, `/no-access`, `/dashboard` |
| Module | Identity and Access |
| Primary role | All human users |
| SRS mapping | `UC-02`, `FR-02`, `FR-03`, `FR-05`, `IR-02`, `IR-03`, `IR-04`, `NFR-08`, `NFR-09` |
| SDD mapping | Identity and Access, Security Architecture |
| Status | Local/dev auth skeletal; future OIDC/OAuth required |

Contract:

| Area | Required behavior |
|---|---|
| Login | Local/dev login for MVP; future OIDC authorization code with PKCE. |
| Callback | Validate state, issuer, audience, expiry, signature, nonce, scopes. |
| Session | Session endpoint returns user, organization memberships, role, permissions, feature flags, active organization. |
| Authorization | Frontend hides irrelevant routes, but backend remains source of truth. |
| Context recovery | If organization context is missing, show context selector or setup/invite path. |
| Session expiry | Preserve draft form data where safe, redirect to login, return to original route after reauth. |
| No access | Show role/org/requested route; do not leak record details. |

API contract:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/dev-login` | MVP local/dev login. |
| `GET` | `/auth/session` | Return authenticated session, memberships, active org, permissions. |
| `GET/POST` | future `/auth/oidc/callback` | Complete OIDC callback. |
| `POST` | future `/auth/logout` | End session and clear local context. |

Acceptance criteria:

```text
- A user never types actorUserId manually in production mode.
- Route loaders block before fetching sensitive entity data when permission is missing.
- Every denied access creates an auditable event without exposing confidential metadata.
- OIDC failure reasons are understandable without exposing tokens or secrets.
```

### 16.4 Administration: Users, Roles, Permissions, Settings, Data Residency

| Field | Value |
|---|---|
| Routes | `/admin/users`, `/admin/roles`, `/admin/settings`, `/admin/feature-flags`, `/admin/data-residency` |
| Module | Administration / Identity and Access |
| Primary role | SME Admin |
| Supporting roles | Auditor read-only, Developer/Integrator for technical settings |
| SRS mapping | `FR-01`, `FR-03`, `FR-04`, `FR-05`, `FR-07`, `NFR-06`, `NFR-07`, `NFR-21`, `NFR-24` |
| SDD mapping | Identity and Access, Security Architecture, Extension Registry |

Panels and actions:

| Panel | Actions | Required side effects |
|---|---|---|
| Users | create, deactivate, reactivate, view memberships | `USER_CREATED`, `USER_STATUS_CHANGED` |
| Roles | create, edit description, attach permissions | `ROLE_CREATED`, `PERMISSION_GRANTED`, `PERMISSION_REVOKED` |
| Approval matrix | configure amount/category/project/risk/finance approval rules | `APPROVAL_RULE_CREATED`, `APPROVAL_RULE_UPDATED` |
| Organization settings | update tax/Shariah/contact/deployment details | `ORGANIZATION_UPDATED` |
| Data residency | configure storage/backup/Fabric channel region policy | `DATA_RESIDENCY_UPDATED` |
| Feature flags | enable planned modules with risk notice | `FEATURE_FLAG_CHANGED` |
| API clients | create client credentials/webhook secrets | `API_CLIENT_CREATED`, secret displayed once |

Acceptance criteria:

```text
- Admin cannot remove the last active organization administrator without break-glass or replacement admin.
- Role changes immediately affect route/action visibility after session refresh.
- Data residency changes show affected storage, backup, object storage, and Fabric participation boundaries.
- Every access/security setting change is auditable.
```

### 16.5 Dashboard and Smart Task Inbox

| Field | Value |
|---|---|
| Route | `/dashboard` |
| Module | Operations / Cross-module cockpit |
| Primary role | All authenticated roles |
| SRS mapping | `NFR-13`, role-specific functional requirements |
| SDD mapping | Observability/Ops, Graph/Canvas, Identity/Access |
| Status | Skeletal health dashboard exists; smart task inbox planned |

Required widgets:

| Widget | Roles | Data source |
|---|---|---|
| Health status | SME Admin, Developer | `/health`, future ops endpoints |
| My next actions | All roles | workflow states, role permissions, audit/outbox/evidence gaps |
| Evidence gaps | Procurement Officer, Financier, Auditor | evidence checklist, evidence packs |
| Review queues | Financier, Shariah, Approver, Auditor | due diligence, Shariah, approvals, audit verification |
| Integration queue | Admin, Developer, Auditor | outbox and reconciliation endpoints |
| Backup freshness | SME Admin, Developer | future backup endpoint |
| Recent audit events | Admin, Auditor | `/audit-events/search` |

Kano delighter tie-in: the dashboard should answer, "What should I do next?" without forcing the user to remember status codes or inspect multiple modules.

### 16.6 Procurement Projects and Graph Entry

| Field | Value |
|---|---|
| Routes | `/procurement/projects`, `/graph/projects`, future `/graph/canvas/:workspaceId` |
| Module | Procurement / Graph-Canvas |
| Primary role | Procurement Officer |
| Supporting roles | SME Admin, Financier User, Shariah Reviewer, Auditor |
| SRS mapping | `FR-09`, `FR-22`, `FR-43` to `FR-46`, `BR-09` |
| SDD mapping | Procurement Core, Graph/Canvas, Security Architecture |

Contract:

| Area | Required behavior |
|---|---|
| Project list | Show active/closed/on-hold projects, budget, procurement status, evidence pack status, finance status. |
| Graph project view | Show nodes for organization, buyer, supplier, requisition, RFQ, quotation, PO, invoice, evidence pack, opportunity, application, contract, closure pack. |
| Authorization | Hide finance nodes for roles without finance/audit visibility. |
| Actions | Create project, open graph, open linked opportunity, open evidence pack, export read-only graph snapshot. |
| Side effects | `PROJECT_CREATED`, `CANVAS_VIEW_OPENED`, optional `GRAPH_EXPORT_CREATED`. |

Acceptance criteria:

```text
- A user can navigate from project graph to source record screens without losing organization/workspace context.
- Graph never exposes confidential finance edges to unauthorized roles.
- Large graph prompts filter refinement instead of freezing.
```

### 16.7 Supplier Onboarding and Supplier Portal

| Field | Value |
|---|---|
| Routes | `/procurement/suppliers`, `/supplier/onboarding/:token`, `/supplier/rfqs`, `/supplier/quotations`, `/supplier/purchase-orders`, `/supplier/invoices` |
| Module | Procurement / Supplier-Contractor Portal |
| Primary role | Procurement Officer, Supplier User |
| Supporting roles | Finance/Accountant, Shariah Reviewer, Auditor |
| SRS mapping | `UC-03`, `UC-04`, `UC-05`, `FR-12`, `FR-16`, `FR-17`, `FR-19`, `FR-20`, `DR-08` |
| SDD mapping | Supplier/Counterparty, Procurement Core, Evidence/Documents |

Required supplier portal actions:

| Action | Role | API / entity | Side effects |
|---|---|---|---|
| Submit onboarding documents | Supplier User | document/evidence endpoints | `SUPPLIER_DOCUMENT_SUBMITTED`, document version/hash recommended |
| Respond to RFQ | Supplier User | `POST /quotations` or future supplier-scoped endpoint | `QUOTATION_SUBMITTED_BY_SUPPLIER` |
| Acknowledge PO | Supplier User | future `POST /purchase-orders/:id/acknowledge` | `PO_ACKNOWLEDGED` |
| Submit delivery evidence | Supplier User | `POST /receipts` or evidence upload | `DELIVERY_EVIDENCE_SUBMITTED` |
| Submit invoice | Supplier User | `POST /invoices` | `INVOICE_SUBMITTED` |

Validation:

| Error condition | UI behavior |
|---|---|
| Missing bank/tax/registration evidence | Show exact missing document and block approved supplier status. |
| Supplier restricted by Shariah eligibility | Allow view; block RFQ/PO use for restricted categories. |
| Duplicate invoice number | Warn and route to exception/reconciliation workflow. |
| Supplier access outside workspace | Show no-access without exposing buyer/finance details. |

Acceptance criteria:

```text
- Supplier can complete only supplier-scoped tasks.
- Procurement users can convert supplier uploads into evidence items without retyping data.
- Supplier cannot view financier due diligence or SME internal ledger unless explicitly shared.
```

### 16.8 Requisition, Approval, RFQ, Quotation, PO, Receipt, Invoice, and Matching

| Field | Value |
|---|---|
| Routes | `/procurement/requisitions`, `/procurement/requisitions/new`, `/procurement/approvals`, `/procurement/rfqs`, `/procurement/quotations`, `/procurement/purchase-orders`, `/procurement/receipts`, `/procurement/invoices`, `/procurement/matching` |
| Module | Procurement |
| Primary role | Procurement Officer, Approver, Finance/Accountant |
| Supporting roles | Supplier User, SME Admin, Auditor |
| SRS mapping | `UC-04`, `UC-05`, `FR-09` to `FR-24`, `IR-05`, `IR-06`, `NFR-16` |
| SDD mapping | Procurement Core, Policy/Rule Engine, Integration Adapters, Evidence/Documents |

Screen-to-action contract:

| Route | Primary data | Primary actions | APIs | Side effects |
|---|---|---|---|---|
| `/procurement/requisitions` | requisitions, status, requester, project, total | create, submit, approve, reject | `/requisitions`, `/requisitions/:id/submit`, `/approve`, `/reject` | `REQUISITION_CREATED`, `REQUISITION_SUBMITTED`, `REQUISITION_APPROVED` |
| `/procurement/approvals` | pending approval requests, matrix rule, amount, risk | approve/reject with comment | `/procurement/approvals`, approval endpoints | `APPROVAL_REQUEST_DECIDED` |
| `/procurement/rfqs` | RFQs, suppliers, items, deadline | create, publish, close | `/rfqs`, `/rfqs/:id/publish` | `RFQ_CREATED`, `RFQ_PUBLISHED` |
| `/procurement/quotations` | supplier quotations, total amount, line comparison | receive, compare, select/reject planned | `/quotations` | `QUOTATION_RECEIVED`, future award events |
| `/procurement/purchase-orders` | POs, supplier, quotation, status | create, issue, cancel planned | `/purchase-orders`, `/purchase-orders/:id/issue` | `PURCHASE_ORDER_CREATED`, `PURCHASE_ORDER_ISSUED` |
| `/procurement/receipts` | receipt records, PO link, quantity/service evidence | record receipt/service confirmation | `/receipts` | `RECEIPT_RECORDED` |
| `/procurement/invoices` | invoice records, supplier, amount, invoice number | record invoice | `/invoices` | `INVOICE_RECORDED` |
| `/procurement/matching` | PO, receipt, invoice match status | view/resolve exceptions planned | `/procurement/matching` | `MATCH_EXCEPTION_RAISED`, `MATCH_EXCEPTION_RESOLVED` |

Acceptance criteria:

```text
- Requisition approval respects approval matrix and segregation rules.
- RFQ publication requires approved requisition or authorized direct-sourcing reason.
- PO issue requires approved source or direct-procurement approval.
- Invoice matching clearly identifies quantity, price, supplier, tax, duplicate, and bank-detail exceptions.
- Procurement records used for financing can be promoted to evidence without duplicate data entry.
```

### 16.9 Evidence, Documents, Hashes, and Audit Timelines

| Field | Value |
|---|---|
| Routes | `/evidence/documents`, `/evidence/items`, `/evidence/packs`, `/evidence/hashes`, `/evidence/timeline`, `/audit`, `/audit/search`, `/audit/entity/:entityType/:entityId` |
| Module | Evidence and Audit |
| Primary role | Procurement Officer, Finance/Accountant, Auditor |
| Supporting roles | Financier User, Shariah Reviewer, SME Admin |
| SRS mapping | `BR-03`, `BR-07`, `BR-08`, `FR-47` to `FR-50`, `DR-03` to `DR-07`, `NFR-09`, `NFR-12`, `NFR-23` |
| SDD mapping | Evidence/Documents, Audit/Fabric, Object Storage, Integration Adapters |

Contract:

| Screen | Required behavior |
|---|---|
| Documents | Upload/register document, show versions, linked entity, content hash, status. |
| Evidence items | Link entity/document/version to evidence type, evidence pack, checklist item. |
| Evidence packs | Generate/export reviewer-friendly PDF and machine-readable JSON. |
| Hashes | Create/verify canonical hash; show mismatch as high-severity exception. |
| Audit search | Filter by entity, actor, event type, date, organization, correlation ID. |
| Entity timeline | Show all material events for an entity with linked evidence/outbox/anchor where available. |

Acceptance criteria:

```text
- Document versions are append-only after lock/approval/contract/execution/anchoring.
- Evidence pack export creates or references hash records and is anchor-ready.
- Auditors can verify evidence without editing workflow records.
- Fabric unavailable does not prevent local hash verification.
```

### 16.10 Finance Opportunities and Applications

| Field | Value |
|---|---|
| Routes | `/finance/opportunities`, `/finance/opportunities/new`, `/finance/applications`, `/finance/applications/:applicationId`, `/finance/applications/:applicationId/evidence` |
| Module | Mudarabah Finance |
| Primary role | Procurement Officer / SME Supplier-Mudarib, Financier User |
| Supporting roles | Finance/Accountant, Shariah Reviewer, Auditor |
| SRS mapping | `UC-06`, `UC-07`, `FR-25` to `FR-29`, `FR-41`, `DR-07` |
| SDD mapping | Mudarabah Finance, Policy/Rule Engine, Evidence/Documents, Graph/Canvas |

Additional contract beyond Section 6:

| Route | Must display | Must allow |
|---|---|---|
| `/finance/opportunities` | opportunity status, project, buyer demand, estimated capital, expected profit, evidence pack, application count | create from project/PO/evidence pack; open graph; open application |
| `/finance/opportunities/new` | source record picker, buyer demand proof, revenue/cost/capital fields, suitability checks | save draft; create application next; block non-revenue opportunities |
| `/finance/applications` | queue grouped by status, evidence gap count, next reviewer, risk rating, due date | filter by role/task/status; open workspace |
| `/finance/applications/:id/evidence` | checklist items, linked evidence, waivers, missing documents, auto-match suggestions | complete/waive/request evidence based on role |

Acceptance criteria:

```text
- Application cannot be submitted for routine internal consumption.
- Evidence checklist pre-fills from existing evidence pack wherever possible.
- The UI always explains exactly why application approval is blocked.
```

### 16.11 Due Diligence and Shariah Review Workspaces

| Field | Value |
|---|---|
| Routes | `/finance/applications/:id/due-diligence`, `/finance/applications/:id/shariah-review` |
| Module | Mudarabah Finance / Policy |
| Primary role | Financier User, Shariah Reviewer |
| Supporting roles | Procurement Officer and Finance/Accountant respond to evidence requests; Auditor read-only |
| SRS mapping | `UC-08`, `UC-09`, `FR-29` to `FR-32`, `FR-41`, `NFR-16` |
| SDD mapping | Mudarabah Finance, Policy/Rule Engine, Evidence/Documents, Security Architecture |

Due diligence required panels:

```text
Buyer evidence
Supplier plan and quotations
Project economics
ERP/accounting history
Cost reasonableness
Risk rating
Reviewer conditions
Decision log
```

Shariah review required panels:

```text
Eligible goods/services
Buyer/supplier restrictions
Profit ratio validation
Guaranteed return prohibition
Loss treatment and negligence/breach clauses
Allowed expenses
Contract term amendments
Reviewer opinion
```

Acceptance criteria:

```text
- Due diligence cannot proceed until evidence checklist is complete or waived by an authorized actor.
- Shariah review cannot be approved if the term implies guaranteed fixed return.
- Reviewer decisions are immutable after final approval unless amendment workflow is used.
- Procurement Officer can respond to evidence requests but cannot record reviewer decisions.
```

### 16.12 Contracts, E-Signature, and Disbursement

| Field | Value |
|---|---|
| Routes | `/finance/contracts`, contract panel inside `/finance/applications/:id`, `/integrations/esign` planned |
| Module | Mudarabah Finance / Evidence / Integrations |
| Primary role | Financier User |
| Supporting roles | SME Admin, Shariah Reviewer, Auditor, Developer/Integrator |
| SRS mapping | `UC-10`, `FR-32`, `FR-33`, `FR-34`, `FR-47`, `FR-48`, `IR-10`, `IR-11`, `NFR-17` |
| SDD mapping | Mudarabah Finance, Evidence/Documents, Integration Adapters, Audit/Fabric |

Contract:

| Action | Required condition | Side effect |
|---|---|---|
| Create contract | Application approved by due diligence and Shariah review | `MUDARABAH_CONTRACT_CREATED` |
| Generate contract document | Contract exists, terms complete, signer known | `Document`, `DocumentVersion`, content hash, `MUDARABAH_CONTRACT_DOCUMENT_GENERATED`, `ESIGNATURE_PACKAGE_REQUESTED` |
| Mark signed | Contract document generated and signature evidence exists or mock signing accepted | `MUDARABAH_CONTRACT_SIGNED`; application `CONTRACT_EXECUTED` |
| Record disbursement | Executed contract | `DISBURSEMENT_RECORDED`; optional finance API outbox |
| Amend contract | Executed contract terms need change | new version, amendment audit; original remains immutable |

Acceptance criteria:

```text
- Contract panel has a readiness meter: terms complete, Shariah approved, due diligence approved, document generated, e-sign queued, signed.
- Executed contract terms cannot be edited inline.
- Payment/finance API failure queues or records pending state without duplicating disbursement.
```

### 16.13 Ledger, Profit/Loss, Distribution, Loss Exception, and Closure

| Field | Value |
|---|---|
| Routes | `/finance/ledgers`, `/finance/profit-loss`, `/finance/closures` |
| Module | Mudarabah Finance / Evidence and Audit |
| Primary role | Finance/Accountant, Financier User |
| Supporting roles | Shariah Reviewer, Auditor, Procurement Officer |
| SRS mapping | `UC-11`, `UC-12`, `FR-35` to `FR-42`, `DR-07`, `NFR-16`, `NFR-23` |
| SDD mapping | Mudarabah Finance, Evidence/Documents, Integration Adapters, Audit/Fabric |

Contract:

| Screen | Required data | Primary actions | Validation |
|---|---|---|---|
| Ledger | disbursement, revenue, allowed expenses, procurement costs, buyer payments, ERP refs | add/import/reconcile ledger entry | application disbursed; entry type/amount/date valid |
| Profit/Loss | revenue, costs, net profit, ratios, distribution preview, source evidence | calculate statement, create distribution/loss exception | ledger evidence complete; no guaranteed fixed return |
| Loss Exception | net loss, cause evidence, negligence/breach indicators, reviewer notes | classify genuine loss or breach/fraud/misconduct | reviewer authority required |
| Closure | contract, approvals, evidence pack, ledger, P/L, distribution/loss decision, audit timeline, hashes/anchors | export closure pack, verify, anchor | P/L calculated; closure evidence complete |

Acceptance criteria:

```text
- P/L statement traces each number to ledger entries and source evidence.
- Profit distribution uses approved ratio only; no fixed capital return is calculated.
- Loss case cannot close without classification evidence.
- Closure pack includes all reviewer decisions and audit events required for verification.
```

### 16.14 Graph/Canvas Cockpit

| Field | Value |
|---|---|
| Routes | `/graph/projects`, future `/graph/canvas/:workspaceId` |
| Module | Graph/Canvas |
| Primary role | Procurement Officer, Financier User |
| Supporting roles | SME Admin, Finance/Accountant, Shariah Reviewer, Auditor |
| SRS mapping | `UC-13`, `FR-43` to `FR-46`, `BR-09`, `DR-09` |
| SDD mapping | Graph/Canvas, Security Architecture, Data Model |

Required behavior:

```text
- Load only authorized visible subgraph.
- Color/mark nodes by status, risk, role, opportunity phase, financing phase, evidence completeness, and integration state.
- Support filters by project, organization, supplier, buyer, opportunity, status, risk, finance phase, evidence gap, anchor status.
- Clicking a node opens source record, evidence pack, audit timeline, or finance workspace based on permission.
- Large graphs must provide auto-layout and filter suggestions.
```

Acceptance criteria:

```text
- Graph helps users see what is missing without becoming the system of record.
- Unauthorized finance/audit nodes are hidden or redacted, not merely disabled.
- Graph export excludes confidential payloads by default.
```

### 16.15 Integrations, Outbox, Reconciliation, and Webhooks

| Field | Value |
|---|---|
| Routes | `/integrations`, `/integrations/outbox`, `/integrations/reconciliation`, `/integrations/webhooks` |
| Module | Integrations |
| Primary role | Developer/Integrator, SME Admin |
| Supporting roles | Auditor read-only, Financier User for finance/e-sign status |
| SRS mapping | `UC-15`, `IR-05` to `IR-12`, `NFR-11`, `NFR-12`, `NFR-13` |
| SDD mapping | Integration Adapters, Outbox, Observability/Ops, Audit/Fabric |

Contract:

| Integration | Setup data | Runtime status | Retry/fallback |
|---|---|---|---|
| ERP | endpoint, credentials reference, mapping, idempotency key strategy | sync pending/completed/failed, external reference | retry outbox, CSV/XLSX fallback |
| Fabric | gateway/channel/chaincode config, identity material reference | anchor pending/anchored/failed, transaction reference | local hash remains valid; retry anchoring |
| E-signature | provider config, callback secret, signer fields | package requested/sent/signed/failed | mock package or manual signed artifact upload |
| Finance API | endpoint, client auth, idempotency policy | application/disbursement notification status | manual disbursement record + reconciliation |
| Webhooks | event type, target URL, secret, status | delivery pending/completed/failed | retry, disable subscription, dead-letter |

Acceptance criteria:

```text
- Users can distinguish business success from integration pending state.
- Replaying integration jobs cannot duplicate business effects.
- Failed integrations show last error, attempts, nextRunAt, aggregate record, and safe remediation path.
```

### 16.16 Reports and Analytics

| Field | Value |
|---|---|
| Routes | `/reports`, `/reports/procurement`, `/reports/finance`, `/reports/audit` |
| Module | Reporting |
| Primary role | SME Admin, Finance/Accountant, Financier User, Auditor |
| Supporting roles | Procurement Officer, Shariah Reviewer |
| SRS mapping | `FR-22`, `FR-40`, `FR-42`, `DR-09`, `NFR-23` |
| SDD mapping | Reporting, Evidence/Documents, Audit/Fabric |
| Status | Planned |

Report categories:

| Report | Purpose | Data sources | Side effects |
|---|---|---|---|
| Procurement spend | Category/supplier/department/project/finance involvement | requisitions, POs, invoices, suppliers | report export audit |
| Supplier performance | Timeliness, quality exceptions, invoice exceptions, response rate | suppliers, RFQs, receipts, invoices | evidence export optional |
| Finance pipeline | applications, exposure, disbursement, milestone risk, closure status | applications, contracts, disbursements, ledgers | financier report audit |
| Profit/loss audit | P/L statements, distributions, loss exceptions, source evidence | ledger, P/L, evidence packs, audit | closure evidence optional |
| Integration health | outbox status, retries, adapter failures, reconciliation | outbox, reconciliation, audit | ops report audit |

Acceptance criteria:

```text
- Reports never expose confidential payloads by default in aggregated exports.
- Exported reports can become evidence items when used for review, dispute, or audit.
```

---

## 17. Full Use Case Acceptance Matrix

| UC | Scenario | Given | When | Then | Evidence to capture |
|---|---|---|---|---|---|
| `UC-01` | Install/configure node | Infrastructure and env are available | Admin runs readiness checks and organization setup | health is green or degraded reasons are shown; organization is created | health screenshot, org audit event, backup status |
| `UC-02` | Authenticate/authorize | User exists or invite token exists | User logs in | correct role landing page appears or no-access page appears | login audit, session payload, access decision |
| `UC-03` | Onboard supplier | Procurement officer has supplier rights | Supplier submits required docs | supplier becomes approved/restricted/blocked with reason | supplier profile, document versions, audit |
| `UC-04` | RFQ/evaluation | Approved requisition exists | RFQ is published and quotations received | comparison/award evidence exists | RFQ, quotations, award decision audit |
| `UC-05` | Procure-to-pay | Approved quotation/PO exists | receipt and invoice are recorded | match status and payment/ERP status are visible | PO, receipt, invoice, match result, ERP outbox |
| `UC-06` | Publish opportunity | Buyer PO/contract evidence exists | user creates finance opportunity | opportunity links project and evidence pack | opportunity record, graph node, audit |
| `UC-07` | Apply for capital | opportunity passes suitability | application submitted | financier workspace receives application and evidence checklist | application status, checklist, audit/outbox |
| `UC-08` | Due diligence | checklist complete | financier records decision | app moves to Shariah review or rejection | due diligence report, conditions, audit |
| `UC-09` | Shariah review | due diligence approved | reviewer records opinion | review decision stored; invalid terms require amendment | Shariah review record, opinion, audit |
| `UC-10` | Contract/disburse | app approved | contract generated, signed, disbursed | contract execution and disbursement are recorded | contract document, e-sign outbox, disbursement audit |
| `UC-11` | Monitor execution | contract executed/disbursed | ledger and milestone events are recorded | monitoring dashboard updates risk and evidence status | ledger entries, procurement evidence, outbox status |
| `UC-12` | P/L and closure | ledger complete | P/L calculated and closure exported | distribution/loss decision and closure pack exist | P/L, distribution/loss exception, closure pack |
| `UC-13` | Network canvas | project and linked entities exist | user opens graph | authorized graph appears with status/risk/evidence overlays | graph snapshot, access redaction test |
| `UC-14` | Verify evidence/audit | evidence pack/hash/anchor exists | auditor verifies | verification status or mismatch exception recorded | hash result, anchor status, audit finding |
| `UC-15` | ERP/accounting integration | adapter configured or CSV fallback chosen | sync/import/export occurs | reconciliation status visible and retryable | outbox, reconciliation record, error/retry trace |

---

## 18. Cognitive Friction Scan

The following friction points are visible when the SRS, SDD, current UI workflow, API endpoints, and schema are read together.

| Friction point | Where it appears | Why it hurts | Unspoken need |
|---|---|---|---|
| Manual organization/user context | Local/dev sessions use `organizationId` and `actorUserId`; many endpoints require them | Users and testers can work in the wrong context or copy IDs manually | System should infer and persist safe org/user context automatically. |
| Repeated procurement-to-finance data entry | Opportunity/application fields overlap project, PO, evidence pack, and ledger data | Procurement Officer retypes buyer demand, capital, cost, and supplier plan | System should create opportunity/application from existing PO/evidence pack. |
| Evidence checklist gaps require manual hunting | Checklist items reference evidence types while documents/evidence packs already exist | Users must remember where evidence lives | System should auto-link evidence items and show gap resolver. |
| Status codes are not self-explanatory | `EVIDENCE_PENDING`, `DUE_DILIGENCE_IN_REVIEW`, `CONTRACT_PENDING_SIGNATURE` | Users need to know what action is next and who owns it | System should show next-best action and role owner. |
| Integration delays look like failures | Outbox and reconciliation are backend concepts | Users may wait or retry manually, risking duplicates | UI should show pending/retrying/completed states and idempotency explanation. |
| Profit/loss calculation can be opaque | Ledger, P/L, distribution, loss exception are separate entities | Reviewer may distrust calculation or struggle to audit it | P/L screen should show lineage from each number to source evidence. |
| Deployment runbook is external to app | Azure VM guide has many manual steps | Student/demo deployers can miss migrations, worker, backup, or firewall checks | App should expose deployment readiness and health checklist. |
| Graph/canvas not yet primary cockpit | Current skeletal flow is sequential navigation | Users must remember which module contains the next task | Graph should become the visual task map. |
| Error resolution is user-driven | Missing evidence, invalid state, token failure, Fabric unavailable | Users must infer remediation | Error states should be self-healing or suggest one-click recovery. |
| Reviewer roles can be confusing | Financier and Shariah decisions are separate but adjacent | Wrong user may attempt blocked action | UI should explain role boundary and show request-transfer/escalation route. |

---

## 19. Hidden Data and Capability Cross-Reference

These values are already present or planned in the SDD/schema/README but are not fully surfaced in the UI contract yet. They should become UI value, not hidden backend exhaust.

| Hidden data/capability | Where it exists | UI value to surface |
|---|---|---|
| `createdAt`, `updatedAt`, lifecycle timestamps | Most Prisma models | Show freshness, aging, SLA, overdue review, stale evidence warnings. |
| `status` on every workflow entity | Prisma models | Render consistent status badge and next action. |
| `metadata` JSON | Audit, documents, evidence, integration records | Explain why an event/action happened without opening raw JSON by default. |
| `AuditEvent.correlationId` | Audit event model | Link one business action to outbox/integration consequences. |
| `OutboxEvent.attempts`, `nextRunAt`, `lastError` | Outbox model | Show retry countdown and safe remediation. |
| `OutboxEvent.idempotencyKey` | Outbox model | Explain why replay is safe and prevent duplicate side effects. |
| `IntegrationReconciliationRecord.externalReference` | Reconciliation model | Let users match MEPN events to ERP/Fabric/e-sign/finance provider records. |
| `HashRecord.canonicalText`, `canonicalHash`, `verifiedAt` | Hash model | One-click local verification and audit confidence. |
| `DocumentVersion.versionNumber`, `contentHash`, `createdByUserId` | Document version model | Immutable document timeline and tamper evidence. |
| `EvidencePack.summary` | Evidence pack model | Reviewer-friendly coverage summary and missing-evidence overview. |
| `ProcurementApprovalRule` amount/role/segregation | Approval rule model | Preview approver routing before submission. |
| `capitalProviderRatio`, `entrepreneurRatio` | Mudarabah application model | Auto-preview profit distribution and detect invalid guaranteed-return patterns. |
| `ProfitDistribution` and `LossException` | Finance models | Explain distribution or loss classification at closure. |
| Worker polling config | README/deployment config | Surface whether outbox processing is active. |
| Deployment commit/build info | Deployment runbook asks to record commit | Show deployed version, commit, environment, and demo readiness. |

---

## 20. SRS Constraints and Error-Healing Requirements

| Constraint / error trigger | Source requirement family | Required UI healing behavior |
|---|---|---|
| Invalid/expired/untrusted token | `IR-02`, `IR-03`, `NFR-08` | Redirect to login, preserve return path, show safe reason, audit denial. |
| Missing role or workspace scope | `FR-03`, `FR-06`, `NFR-07` | Show no-access page with role/context explanation and request-access path. |
| Missing financing evidence | `BR-03`, `BR-04`, `FR-28`, `NFR-16` | Auto-generate gap list, prefill from existing evidence, block transition with exact gaps. |
| Non-revenue opportunity | `FR-27` | Block application submission and suggest procurement-only path. |
| Shariah-ineligible goods/services | `FR-30` | Show ineligibility reason, allow amendment/request changes, prevent approval. |
| Guaranteed fixed return pattern | `FR-38`, Shariah requirement | Warn and block calculation/contract term; propose profit-ratio correction. |
| Contract already executed | `NFR-17`, `DR-04` | Disable edit; route to amendment workflow. |
| Fabric unavailable | `NFR-12`, `FR-49` | Continue local workflow, show anchors pending, enqueue retry. |
| ERP/e-sign/finance API unavailable | `NFR-11`, `IR-06`, `IR-10`, `IR-11` | Queue outbox event, show retry state, prevent duplicate submissions. |
| Confidential data on Fabric | `DR-05`, `NFR-18` | Redact payload preview; only show hashes/minimal metadata before anchor. |
| Backup/restore not configured | `NFR-10`, `NFR-19` | Show backup readiness warning and prevent production-readiness confirmation. |
| Large document volume/search | `NFR-04` | Paginate, filter, index, and suggest narrowed search rather than loading everything. |
| Accessibility failure risk | `NFR-15` | Use accessible components, keyboard focus, error announcements, and labels. |
| Localization/currency ambiguity | `NFR-14` | Use organization currency/date/tax labels; warn when imported data uses another currency. |

---

## 21. Kano Delighter Requirements

These are unspoken requirements extracted using the formulas:

```text
Formula A: UI Friction + SDD Data -> Auto-fill / predict the next step.
Formula B: SDD Hidden Data -> Proactive alerts / insight dashboards.
Formula C: SRS Error + SDD Tech -> Auto-conversion / graceful fallback.
```

Each requirement uses this product format:

```text
As a [user], I didn't think to ask for [automation/insight], but because the system [uses existing data/handles error seamlessly], I save time and feel highly satisfied.
```

| ID | Kano type | Delighter requirement | Formula | Existing data/capability used | Acceptance signal |
|---|---|---|---|---|---|
| `DLR-01` | Delighter | As any user, I didn't think to ask for a role-aware landing page, but because the system uses my role, organization, workspace, and pending workflow states, I immediately see the next best action. | A+B | membership, roles, statuses, audit/outbox/evidence gaps | Dashboard shows role-specific task cards within one click after login. |
| `DLR-02` | Delighter | As a Procurement Officer, I didn't think to ask for auto-created financing opportunities, but because the system can read the project, PO, buyer demand, and evidence pack, I can create a mudarabah opportunity without retyping core fields. | A+B | Project, PurchaseOrder, EvidencePack, ProcurementOpportunity | Opportunity form prefills title, project, estimated capital, supplier, evidence pack, and currency. |
| `DLR-03` | Delighter | As a Mudarib, I didn't think to ask for checklist prefill, but because the system scans existing evidence items by type, I start with completed evidence wherever possible. | A+B | EvidencePack.items, EvidenceChecklistItem.requiredCode | Checklist generation auto-completes matching evidence and shows only real gaps. |
| `DLR-04` | Delighter | As a Financier User, I didn't think to ask for a contract readiness meter, but because the system knows due diligence, Shariah review, checklist, contract document, and e-sign states, I can trust whether disbursement is safe. | B | application status, review records, contract, document version, outbox | Contract panel shows readiness checklist and blocks unsafe disbursement. |
| `DLR-05` | Delighter | As a Finance/Accountant, I didn't think to ask for explainable P/L, but because the system links ledger entries to procurement evidence and reviewer decisions, I can defend every number in the profit/loss statement. | A+B | ledger, evidence, DR-07 lineage, P/L distribution | P/L screen expands each amount into source entries and evidence links. |
| `DLR-06` | Delighter | As an Auditor, I didn't think to ask for one-click verification, but because the system stores canonical hashes and Fabric references, I can verify evidence locally even if Fabric is pending. | B+C | HashRecord, AuditAnchor, DocumentVersion | Verify button returns verified/mismatch/pending with audit result. |
| `DLR-07` | Delighter | As an SME Admin, I didn't think to ask for deployment readiness scoring, but because the system can check health, worker, database, Redis, MinIO, migrations, ports, and backup freshness, I know if the app is safe for demo or UAT. | B+C | health, deployment guide checklist, backup metadata | Operations page shows red/yellow/green readiness and remediation. |
| `DLR-08` | Delighter | As a Developer/Integrator, I didn't think to ask for outbox retry explanation, but because the system shows attempts, nextRunAt, lastError, and idempotencyKey, I can fix integrations without duplicate business effects. | B+C | OutboxEvent fields | Integration page shows retry countdown and safe replay guidance. |
| `DLR-09` | Delighter | As a Shariah Reviewer, I didn't think to ask for automatic profit-ratio warnings, but because the system knows capital and entrepreneur ratios, it flags guaranteed-return-like terms before approval. | A+C | capitalProviderRatio, entrepreneurRatio, Shariah review rules | Shariah form blocks fixed return and suggests ratio-based correction. |
| `DLR-10` | Delighter | As a Supplier User, I didn't think to ask for a document completeness meter, but because the system knows required supplier evidence and uploaded versions, I can finish onboarding without guessing. | A+B | Supplier, DocumentVersion, EvidenceItem | Supplier onboarding shows missing docs and approval blocker. |
| `DLR-11` | Delighter | As an Approver, I didn't think to ask who should approve next, but because approval rules contain amount and role thresholds, the system routes the request and explains the rule. | A+B | ProcurementApprovalRule, ApprovalRequest | Requisition screen previews approver route before submit. |
| `DLR-12` | Delighter | As a Financier User, I didn't think to ask for buyer/supplier risk highlights, but because the system already has supplier performance, invoice exceptions, delivery status, and evidence gaps, I see early risk indicators. | B | supplier metrics, receipts, invoices, evidence gaps | Due diligence screen shows risk badges and linked causes. |
| `DLR-13` | Delighter | As any reviewer, I didn't think to ask for an audit drawer, but because every material action creates AuditEvents, I can inspect history without leaving the workflow. | B | AuditEvent entity timelines | Entity screens include contextual audit drawer. |
| `DLR-14` | Delighter | As a Procurement Officer, I didn't think to ask for duplicate-invoice rescue, but because invoice numbers are unique per organization and supplier/amount/PO data is available, the system warns before creating duplicates. | A+C | Invoice unique keys, supplier/PO data | Duplicate invoice attempt opens exception guidance rather than failing generically. |
| `DLR-15` | Delighter | As a Financier User, I didn't think to ask for safe disbursement retry, but because the system uses idempotency and reconciliation, I can retry failed finance notifications without duplicate disbursement records. | C | OutboxEvent.idempotencyKey, Disbursement, reconciliation | Retry action is available only for integration side effect, not duplicate business disbursement. |
| `DLR-16` | Delighter | As an SME using CSV/XLSX instead of ERP APIs, I didn't think to ask for auto-mapping, but because the system knows procurement and ledger fields, imports can suggest field mappings and detect missing columns. | A+C | IR-07, schema fields | Import wizard suggests mappings and validates before commit. |
| `DLR-17` | Delighter | As a global SME Admin, I didn't think to ask for localization safety, but because the organization stores currency/date/tax settings, the UI warns when imported or typed data conflicts. | B+C | organization settings, NFR-14 | Form warns on currency/date/tax mismatch before save. |
| `DLR-18` | Delighter | As an Auditor, I didn't think to ask for closure pack quality scoring, but because the system knows required pack contents, hashes, anchors, and reviewer decisions, it tells me whether a closure is review-ready. | A+B | ClosurePack.summary, EvidencePack, HashRecord, AuditAnchor | Closure page shows completeness score and exact missing items. |
| `DLR-19` | Delighter | As an SME Admin, I didn't think to ask for backup freshness nudges, but because the system knows RPO/RTO targets, it warns before data protection becomes stale. | B+C | backup status, NFR-10 | Dashboard shows backup freshness and restore-test status. |
| `DLR-20` | Delighter | As a demo operator, I didn't think to ask for student-budget hosting warnings, but because the deployment runbook knows temporary ports and VM constraints, the UI warns when demo exposure is unsafe. | B+C | deployment mode, ports checklist | Operations screen flags public API/web ports and no TLS. |
| `DLR-21` | Delighter | As a Financier User, I didn't think to ask for condition tracking, but because due diligence notes and application status exist, the system can track outstanding approval conditions until closure. | A+B | DueDiligenceReport.notes/status, application status | Conditions appear as checklist items linked to evidence. |
| `DLR-22` | Delighter | As a Shariah Reviewer, I didn't think to ask for loss classification assistance, but because ledger entries, evidence, and exception records exist, the system prompts for genuine loss vs breach indicators. | A+C | ProfitLossStatement, LossException, evidence | Loss workflow prompts classification and required evidence before closure. |
| `DLR-23` | Delighter | As an SME Admin, I didn't think to ask for data-residency visualization, but because storage, backup, and Fabric participation can be configured, the UI shows where each sensitive data class resides. | B | organization settings, deployment/Fabric config | Data residency screen maps records/documents/hashes/backups/anchors. |
| `DLR-24` | Delighter | As QA, I didn't think to ask for demo-data navigation, but because seed output includes IDs and reviewer URLs, the UI can offer a safe UAT mode that jumps to seeded scenarios. | A+B | UAT seed output, local/dev environment | UAT banner provides role-specific scenario links in non-production. |
| `DLR-25` | Delighter | As any user blocked by an invalid state, I didn't think to ask for a recovery path, but because the system knows the required state and missing prerequisites, it explains the next valid action instead of just failing. | A+C | lifecycle state, validation errors, required evidence | Error panels include “why blocked” and “go fix it” links. |

### 21.1 Delighter implementation priority

| Priority | Delighter IDs | Reason |
|---|---|---|
| P1 UX uplift | `DLR-01`, `DLR-03`, `DLR-04`, `DLR-05`, `DLR-07`, `DLR-08`, `DLR-13`, `DLR-25` | High impact using data already present in MVP. |
| P1 audit/compliance trust | `DLR-06`, `DLR-09`, `DLR-18`, `DLR-22`, `DLR-23` | Improves reviewer confidence and reduces dispute handling. |
| P2 productivity | `DLR-02`, `DLR-10`, `DLR-11`, `DLR-12`, `DLR-14`, `DLR-15`, `DLR-16`, `DLR-17`, `DLR-19`, `DLR-20`, `DLR-21`, `DLR-24` | Valuable but can follow stable core flow. |

---

## 22. Backend, API, and OpenAPI Backlog From the Full UI Contract

| Backlog item | Reason | Modules affected |
|---|---|---|
| Normalize error response DTOs | UI needs consistent 400/401/403/404/409/422/503 handling | all modules |
| Add permission guard abstraction | Current role checks must become permission/workspace aware | Identity, API gateway, all modules |
| Add OIDC callback/session endpoints | SRS requires OAuth/OIDC + PKCE | Identity/Auth |
| Add invitation endpoints | Needed for supplier/financier/auditor onboarding | Identity/Access |
| Add operations readiness endpoints | Hosting/deployment UI needs health beyond `/health` | Operations |
| Add backup status endpoint | NFR-10 UI contract | Operations |
| Add matching endpoint and exception workflow | Procurement matching is in SRS and roadmap | Procurement |
| Add supplier portal scoped endpoints | Supplier user must not use internal procurement screens | Procurement/Supplier |
| Add formal waiver model | Evidence gaps need auditable waiver path | Evidence/Finance/Policy |
| Add contract amendment workflow | NFR-17 requires versioned amendment | Finance/Evidence |
| Add Fabric anchor verification endpoint | Audit UI needs verify status | Integrations/Audit |
| Add report endpoints | Reporting roadmap requires exportable reports | Reporting/Evidence |
| Generate OpenAPI docs | SRS/IR-01 requires documented versioned REST APIs | API |
| Add shared Zod DTO package | Frontend and backend validation should align | packages/shared |

---

## 23. Full UAT / E2E Coverage Matrix

| Test class | Required scenarios |
|---|---|
| Hosting/ops | healthy deployment, degraded worker, database down, backup overdue, no TLS warning. |
| Auth | login success, expired session, invalid token, no role, wrong workspace, route return after login. |
| Admin | create org, invite user, accept invite, assign role, remove permission, data residency update. |
| Supplier | onboarding docs complete/incomplete, restricted supplier, supplier RFQ response, invoice duplicate. |
| Procurement | requisition submit/approve/reject, RFQ publish, quotation receive, PO issue, receipt, invoice, match exception. |
| Evidence | document upload/version, evidence pack export, hash verify, hash mismatch, audit timeline. |
| Finance opportunity/application | create opportunity from project/PO, block non-revenue opportunity, submit application, checklist prefill/gap. |
| Due diligence | approve, reject, request changes, block when checklist incomplete. |
| Shariah review | approve, reject, amendment required, block guaranteed return. |
| Contract/disbursement | generate contract, generate document/e-sign outbox, mark signed, disburse, block unsigned contract. |
| Ledger/P&L/closure | ledger entry, P/L positive distribution, loss exception, closure export, audit verification. |
| Graph/canvas | load authorized graph, redacted finance nodes, filters, node navigation. |
| Integrations | ERP sync queued/completed/failed/retried, Fabric mock anchor, webhook failure retry, reconciliation record. |
| Delighters | next-best-action dashboard, evidence auto-link, P/L lineage, deployment readiness, outbox retry explanation. |

---

## 24. Completion Criteria for “Fully Covered” UI Contract

The UI contract should be considered fully covered only when the following are true:

```text
[ ] Every SRS use case UC-01 through UC-15 has at least one route contract.
[ ] Every SRS functional requirement group has UI/API/state/audit traceability.
[ ] Every SDD component has at least one visible UI, admin, integration, or operations surface when applicable.
[ ] Every route has role, state, data, action, API, validation, error, audit/evidence/outbox, and acceptance criteria.
[ ] Authentication, registration, invitation, organization setup, and authorization are contracted before business flows.
[ ] Hosting, deployment readiness, health, jobs, backups, and maintenance are contracted.
[ ] Procurement, supplier, evidence, audit, finance, graph, integrations, admin, operations, and reporting are contracted.
[ ] Cognitive-friction findings are converted into delighter backlog items.
[ ] Hidden backend data has a UI purpose or is intentionally hidden for security/privacy.
[ ] SRS constraints have graceful UI fallback or self-healing behavior.
[ ] UAT coverage includes success, unauthorized, invalid state, missing evidence, integration pending, and audit verification scenarios.
```

---

## 25. Immediate Implementation Sequence Recommended

```text
Round 1: Auth/session/context shell
Round 2: Organization setup, users, roles, invitations
Round 3: Operations health/deployment readiness
Round 4: Procurement source-to-pay screens and matching
Round 5: Evidence/documents/audit entity drawer
Round 6: Finance opportunity/application evidence workspace
Round 7: Due diligence and Shariah reviewer workspaces
Round 8: Contract/e-sign/disbursement
Round 9: Ledger/P&L/loss/closure
Round 10: Integrations/outbox/reconciliation
Round 11: Graph/canvas cockpit and smart next-best-action dashboard
Round 12: Reporting and delighter backlog
```

Each round must update:

```text
- UI route and component contract
- API/OpenAPI contract
- permission matrix
- database/entity mapping
- audit/evidence/outbox matrix
- UAT scenario checklist
- roadmap feature intake block
```



---

## 26. Cloud Server Entry, Organization Bootstrap, and Platform Manager Dashboard Contract

### 26.1 Position

The current contract already contains the required building blocks for authentication, organization setup, organization context, and role-based landing. This section makes the cloud-entry wording explicit so developers do not interpret MEPN as starting only from an already-authenticated internal dashboard.

The intended user journey is:

```text
User opens MEPN cloud/server URL
  -> Public cloud landing page
  -> Choose one:
       A. Sign in to existing organization
       B. Register a new organization
       C. Accept an invitation
  -> Authenticate as a human user
  -> Bind session to one organization/workspace context
  -> Enter role landing page
  -> Platform Manager / SME Admin reaches dashboard
  -> Dashboard shows setup, health, users, integrations, evidence, and next tasks
```

Important terminology rule:

```text
The user does not authenticate "as an organization" literally.
The user authenticates as a human identity, then the system resolves or creates
the organization context through Membership, Invitation, Workspace, Role, and Permission.
```

This avoids a security mistake where the organization itself is treated as the principal. The authenticated principal is the user or service client; the organization is the tenant/context.

### 26.2 Does this contradict the SRS, SDD, or product vision?

No. This flow is aligned with the SRS, SDD, deployment guide, and product vision when interpreted as:

```text
cloud/server landing -> human authentication -> organization registration/selection -> organization-scoped dashboard
```

It supports:

| Source concern | Alignment |
|---|---|
| SME self-hosted or managed deployment | The cloud/server URL can be an Azure prototype endpoint, self-hosted SME domain, or future managed domain. |
| `UC-01 Install and configure SME node` | A first-run organization registration path is the UI counterpart of node setup and organization profile creation. |
| `UC-02 Authenticate and authorize user` | The login/callback/session flow maps identity to organization roles before protected records are visible. |
| Identity and Access module | Organization, User, Role, Permission, Membership, Workspace, and Invitation are the right primitives for this flow. |
| Product vision | The dashboard is not the final business cockpit; it is the entry/control surface before the graph/canvas and procurement-finance workspaces. |

The only wording to avoid is:

```text
Authenticate as organization
```

Use this instead:

```text
Authenticate as user, then select/register organization context.
```

If "platform manager" means the SME's organization administrator, it maps cleanly to `SME Admin` / `ORG_ADMIN`. If it means a global SaaS operator managing many unrelated tenant organizations, then a new `PLATFORM_OPERATOR` role, additional cross-tenant safeguards, and new SRS/SDD traceability would be required.

### 26.3 Route and state flow

| Step | Route | Actor state | UI decision | API/backend responsibility | Next state |
|---|---|---|---|---|---|
| Open cloud server | `/` or `/landing` | Anonymous or returning user | Show public landing; if valid session exists, silently evaluate role landing. | Optional safe health ping; no confidential data. | `ANONYMOUS`, `SESSION_CHECKING`, or redirect |
| Sign in | `/login` | Anonymous | Choose existing organization sign-in, dev login, or OIDC login. | Start local/dev auth or OIDC authorization code with PKCE. | `AUTHENTICATING` |
| OIDC callback | `/auth/callback` | Callback validating | Show validation progress and error-safe recovery. | Validate issuer, audience, expiry, signature, nonce, state, scopes. | `AUTHENTICATED_NO_ORG`, `AUTHORIZED`, or `TOKEN_INVALID` |
| Register organization | `/org/register` or `/org/setup` | Authenticated no org, or bootstrap admin | Capture legal name, registration number, tax ID, Shariah profile, deployment mode, admin profile. | Create Organization, User if needed, Role, Membership, Workspace, audit events. | `ORG_ACTIVE`, `AUTHORIZED` |
| Accept invitation | `/invite/:token` | Invited user | Validate token, show role/workspace, login/register if needed. | Create/activate Membership; bind acceptedById; audit invitation acceptance. | `AUTHORIZED` |
| Organization context | `/auth/session` or route loader | Authenticated user | If multiple orgs, ask user to choose organization. | Verify active Membership and role/permission set. | `ORG_CONTEXT_SELECTED` |
| Platform manager dashboard | `/dashboard` | SME Admin / ORG_ADMIN | Show setup health, org profile, users/roles, integrations, backups, deployment readiness, next tasks. | Aggregate health, org, memberships, audit, outbox, backup/readiness data. | `READY_FOR_SETUP_TASKS` or `READY_FOR_COCKPIT` |
| Product cockpit | `/graph/projects` or role-specific route | Authorized role | Continue to graph/canvas, procurement, finance, evidence, audit, or integration queue. | Enforce route permission and workspace/object scope. | Business workflow |

### 26.4 Screen Contract: Cloud Server Landing Page

| Field | Value |
|---|---|
| Route | `/` or `/landing` |
| Module | Public Bootstrap / Identity and Access |
| Primary roles | Anonymous visitor, returning authenticated user |
| Supporting roles | SME Admin, Developer/Integrator |
| SRS mapping | `UC-01`, `UC-02`, `FR-01`, `FR-02`, `FR-03`, `IR-02`, `IR-03`, `NFR-08`, `NFR-19` |
| SDD mapping | Identity and Access, Security Architecture, Deployment Architecture, Observability/Ops |
| Status | Planned contract; current implementation may route directly to `/dashboard` or `/org/setup` in local/dev mode |

Purpose:

```text
Give users a safe entry point into the hosted MEPN node without exposing protected
organization data. The page lets the user sign in to an existing organization,
register a new organization, or accept an invitation.
```

Data displayed:

| UI area | Data source | Required fields / behavior |
|---|---|---|
| Product header | Static config | Product name, environment label if non-production, deployment mode label where safe. |
| Safe service status | `GET /api/v1/health` or static app config | Show generic availability only. Do not expose internal database/Redis/MinIO details to anonymous users. |
| Existing organization CTA | Static/login config | "Sign in" starts OIDC/local login and preserves `returnTo`. |
| Register organization CTA | Route config | "Register organization" opens `/org/register` or `/org/setup`. |
| Invitation CTA | Token route | "I have an invitation" opens `/invite/:token` or token-entry form if supported. |
| Trust/safety note | Static content | Explain that procurement, finance, and evidence records are shown only after authorization. |

Allowed actions:

| Action | Visible to | Enabled when | API / route | Result |
|---|---|---|---|---|
| Sign in | Anonymous | Auth provider configured or dev auth enabled | `/login`, OIDC authorize, or `POST /api/v1/auth/dev-login` | Session flow starts |
| Register organization | Anonymous or authenticated no-org user | Registration/bootstrap enabled | `/org/register` or `/org/setup` | Organization setup flow starts |
| Accept invitation | Anonymous or authenticated user | Token exists and is not expired/revoked | `/invite/:token` | Invitation flow starts |
| Continue existing session | Returning user | Valid session exists | `GET /api/v1/auth/session` | Redirect to role landing |
| View public docs/help | Anonymous | Static help enabled | static link | No protected data |

Validation and security rules:

| Rule | Frontend behavior | Backend behavior |
|---|---|---|
| Existing session valid | Skip landing after brief session check and redirect to role landing. | Return session with active orgs/roles/scopes only. |
| Existing session expired | Show login with `returnTo` preserved. | Return `401 SESSION_EXPIRED`; audit if session was previously known. |
| No organization | Show register organization / accept invite path. | Do not return protected business records. |
| No role | Show no-access route after login. | Return `403 INSUFFICIENT_PERMISSION`; create access-denied audit event. |
| Anonymous health check | Show only generic availability. | Do not expose secrets, container names, database host, or internal stack traces. |
| Production OIDC | Do not trust client-supplied `actorUserId`. | Derive actor from token claims and membership; validate issuer/audience/nonce/scope. |

Audit/evidence/outbox side effects:

| Event | Trigger | Notes |
|---|---|---|
| `LANDING_OPENED` | Optional analytics/audit in non-sensitive form | Do not track confidential data. |
| `LOGIN_STARTED` | User starts login | Include provider and `returnTo` safely. |
| `LOGIN_SUCCEEDED` | Session established | Link user and organization context when known. |
| `LOGIN_FAILED` | Token/dev login failure | Do not log secrets/tokens. |
| `ORGANIZATION_REGISTRATION_STARTED` | User starts registration | Optional event before org exists. |
| `ACCESS_DENIED` | Authenticated user lacks role/workspace | Must be auditable. |

Acceptance criteria:

```text
- Anonymous users can reach the cloud/server URL without seeing protected data.
- Returning authorized users are routed to the correct role landing page.
- Authenticated users with no organization are routed to organization registration or invitation acceptance.
- Login preserves the user's intended destination through `returnTo`.
- The landing page does not expose database, Redis, MinIO, worker, Fabric, or secret details.
- Production authentication derives actor identity from token/session, not from arbitrary request body fields.
```

### 26.5 Screen Contract: Organization Registration / First-Run Setup

| Field | Value |
|---|---|
| Route | `/org/register` or `/org/setup` |
| Module | Identity and Access / Administration |
| Primary role | Bootstrap user, future SME Admin |
| Supporting roles | Developer/Integrator |
| SRS mapping | `UC-01`, `FR-01`, `FR-02`, `FR-03`, `FR-05`, `NFR-07`, `NFR-19`, `NFR-21` |
| SDD mapping | Identity and Access, Deployment Architecture, Security Architecture, Data Model |
| Current endpoint baseline | `POST /api/v1/orgs`, `POST /api/v1/users`, `POST /api/v1/roles`, `POST /api/v1/memberships`, `GET /api/v1/auth/session` |

Purpose:

```text
Create the first organization context and platform-manager/SME-admin access so
users can enter MEPN with a valid tenant boundary, role, workspace, and audit trail.
```

Required fields:

| Field | Required? | Rule |
|---|---:|---|
| Organization legal name | Yes | Must be non-empty and human-readable. |
| Registration number | Recommended | Required where jurisdiction/business process requires it. |
| Tax identifier | Optional / configurable | Should support local tax labels. |
| Shariah profile | Optional at bootstrap; required before Shariah-sensitive finance templates | Can be completed later by authorized admin/reviewer. |
| Deployment mode | Yes | Default `standalone_sme`; choices must match allowed SRS/SDD deployment modes. |
| Admin display name | Yes | Used for initial user record. |
| Admin email | Yes | Must be valid email and unique as user identity. |
| Data residency / backup region | Planned | Required before production-readiness confirmation. |

Created records:

```text
Organization
User
Role ORG_ADMIN / SME Admin
Membership
Default Workspace
AuditEvent ORGANIZATION_CREATED
AuditEvent USER_CREATED
AuditEvent MEMBERSHIP_ASSIGNED
AuditEvent ORG_CONTEXT_SELECTED
```

Validation and error healing:

| Error | Required UI behavior |
|---|---|
| Email already exists | Offer sign-in and organization join/invitation path instead of dead-end failure. |
| Organization already exists for same admin | Offer organization switcher. |
| Missing deployment mode | Default safely to `standalone_sme` and explain. |
| IdP unavailable during bootstrap | Allow local bootstrap admin only if deployment policy permits; flag OIDC setup as incomplete. |
| Backup/data residency not configured | Allow dashboard entry but show setup task and prevent production-ready confirmation. |

Acceptance criteria:

```text
- Registration creates an organization-scoped admin context, not a global unrestricted account.
- The first admin can reach `/dashboard` after organization setup.
- The dashboard clearly shows incomplete setup tasks rather than pretending the node is production-ready.
- Every created identity/organization record has an audit event or traceable setup record.
```

### 26.6 Screen Contract: Platform Manager / SME Admin Dashboard

| Field | Value |
|---|---|
| Route | `/dashboard` |
| Module | Home / Administration / Operations |
| Primary role | SME Admin / Platform Manager |
| Supporting roles | Developer/Integrator, Auditor read-only where allowed |
| SRS mapping | `UC-01`, `UC-02`, `FR-01`, `FR-03`, `FR-05`, `NFR-10`, `NFR-13`, `NFR-19`, `NFR-21` |
| SDD mapping | Identity and Access, Observability/Ops, Deployment Architecture, Integration Adapters, Audit/Fabric |
| Meaning of "Platform Manager" | Organization-level platform manager for one SME/financial-entity node. Not a cross-tenant SaaS super-admin unless separately specified. |

Required dashboard cards:

| Card | Required data | Primary action |
|---|---|---|
| Organization profile | legal name, registration number, deployment mode, Shariah profile completeness | Edit organization profile |
| Setup completeness | org profile, admin membership, default workspace, roles, backup, integration readiness | Continue setup |
| User and role management | active users, pending invitations, roles, missing critical roles | Invite user / assign role |
| Security/auth readiness | auth mode, OIDC status, session policy, last access-denied events | Configure auth / review denied access |
| Deployment health | API, database, Redis, object storage, worker, environment, version/commit where available | Open operations health |
| Backup and restore | last backup time, RPO/RTO status, restore-test status | Configure backup / view runbook |
| Integration readiness | ERP, Fabric, e-sign, finance API, webhooks, outbox failures | Configure integration / retry outbox |
| Evidence/audit readiness | recent audit events, pending anchors, hash mismatch count | Open audit/evidence |
| Next best actions | role-aware tasks and incomplete workflows | Jump to task |
| UAT/demo readiness | seeded data availability, demo URLs, environment warning | Open UAT scenario links in non-production |

Allowed actions:

| Action | Permission | API / route | Side effects |
|---|---|---|---|
| Edit organization profile | `admin:organization:update` | `PATCH /api/v1/orgs/:id` | `ORGANIZATION_UPDATED` |
| Invite user | `admin:invitation:create` | future invitation endpoint | `INVITATION_CREATED` |
| Assign role | `admin:membership:update` | `POST /api/v1/memberships` or future update endpoint | `MEMBERSHIP_ASSIGNED` |
| Review audit | `audit:event:read` | `/audit/search` | no mutation |
| Open deployment health | `operations:health:read` | `/operations/health` or `/dashboard` health query | optional `DEPLOYMENT_HEALTH_CHECKED` |
| Retry failed integration | `integration:outbox:retry` | future retry endpoint | `OUTBOX_RETRY_REQUESTED` |
| Confirm production readiness | `operations:readiness:confirm` | future readiness endpoint | `PRODUCTION_READINESS_CONFIRMED`; blocked until TLS/backups/auth/settings meet policy |

Acceptance criteria:

```text
- SME Admin / Platform Manager dashboard is the first protected page after organization setup.
- Dashboard distinguishes demo/prototype readiness from production readiness.
- Dashboard never grants cross-organization access unless the user has explicit membership in each organization.
- Dashboard shows next setup or business action instead of forcing the user to remember the workflow.
- Dashboard exposes degraded health, pending backups, failed outbox events, and missing security setup as actionable warnings.
```

### 26.7 Cloud entry delighter requirements

| ID | Kano type | Delighter requirement | Formula | Acceptance signal |
|---|---|---|---|---|
| `DLR-26` | Delighter | As a returning user, I didn't think to ask for zero-click routing, but because the system remembers my valid session, active organization, role, and pending tasks, I skip the landing page and land directly on the right dashboard or task queue. | A+B | User with valid session reaches `/dashboard`, `/finance/applications`, or role route without reselecting org. |
| `DLR-27` | Delighter | As a new SME Admin, I didn't think to ask for guided organization bootstrap, but because the system knows which setup items are missing, I get a checklist that turns a blank deployment into a ready node. | A+C | Dashboard setup checklist shows org, users, roles, backup, OIDC, integrations, and readiness status. |
| `DLR-28` | Delighter | As a demo operator, I didn't think to ask for cloud-server safety warnings, but because the system knows the environment, public ports, auth mode, TLS, and backup status, I know whether the server is safe for demo, UAT, or production. | B+C | Dashboard/operations page labels `DEMO`, `UAT`, or `PRODUCTION_READY_BLOCKED` with reasons. |
| `DLR-29` | Delighter | As an invited supplier/financier/reviewer, I didn't think to ask where to go after accepting an invite, but because the system maps my invitation role and workspace, it sends me directly to the scoped task. | A+B | Invite acceptance redirects supplier to RFQs, financier to due diligence queue, reviewer to Shariah tasks, auditor to evidence pack. |

### 26.8 Traceability addendum for the cloud-entry flow

| User goal | SRS mapping | UI flow | SDD component | Current contract status |
|---|---|---|---|---|
| Reach hosted MEPN node safely | `UC-01`, `NFR-19` | `/` or `/landing` with safe public entry | Deployment Architecture, Observability/Ops | Added in this section |
| Authenticate as human user | `UC-02`, `FR-02`, `IR-02`, `IR-03`, `NFR-08` | `/login` -> `/auth/callback` -> session | Identity and Access, Security Architecture | Existing + clarified |
| Register organization | `UC-01`, `FR-01`, `FR-03`, `NFR-07` | `/org/register` or `/org/setup` | Identity and Access, Data Model | Existing + clarified |
| Bind user to organization context | `FR-03`, `FR-05`, `NFR-07`, `NFR-09` | membership, role, workspace, organization switcher | Security Architecture, Data Model | Existing + clarified |
| Enter platform-manager dashboard | `UC-01`, `UC-02`, `NFR-10`, `NFR-13`, `NFR-19` | `/dashboard` setup/health/readiness | Observability/Ops, Deployment Architecture | Added in this section |

