# MEPN UI Contract Flow

## 1. Document Control

| Item | Value |
|---|---|
| Product | Mudarabah-Enabled Procurement Network |
| Codename | MEPN |
| Document type | UI Contract Flow |
| Repository path | `docs/ui/mepn-ui-contract-flow.md` |
| Source documents | `docs/requirement/mudarabah_eprocurement_srs.tex`, `docs/design/mepn_software_design_description.tex`, `docs/ui/skeletal-web-ui-workflow.md`, `docs/roadmap/module-roadmap.md` |
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
