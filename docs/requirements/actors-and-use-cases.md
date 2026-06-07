# MEPN Actors And Use Cases

This document is a standalone actor and use-case reference for MEPN. It is
derived from the SRS use-case specifications, the SDD system boundary, and the
UI contract traceability notes. It does not state or imply implementation
status.

## Source Basis

- `docs/requirements/mudarabah_eprocurement_srs.tex`
- `docs/design/mepn_software_design_description.tex`
- `docs/ui/mepn-ui-contract-flow.md`
- `docs/ui/mepn-ui-contract-flow-appendix.md`
- `docs/ui/figma-to-ui-contract-map.md`
- `docs/design/figma-make-reference/`

The Figma Make prototype remains a visual and interaction reference only. It is
not the source of truth for authorization, validation, state transitions, API
contracts, backend persistence, audit behavior, Fabric anchoring, ledger
calculation, routing, or deployment behavior.

## Fabric Boundary

MEPN treats Hyperledger Fabric as optional proof infrastructure, not as the
primary system of record. The application stores business records, documents,
workflow state, and audit metadata in MEPN-controlled application storage.

- MEPN must not perform direct Fabric topology mutation from core application
  workflows.
- Channel creation, organization joins, Fabric CA enrollment, MSP material
  management, orderer administration, and channel configuration updates remain
  outside the normal application boundary unless a separately approved
  operator-agent boundary exists.
- Fabric anchoring and verification must be outbox-driven, idempotent,
  retryable, reconcilable, and non-blocking for local procurement, evidence,
  audit, and finance workflows.
- Mock Fabric anchors may be useful for local development or demos, but mock
  proof must be clearly labeled and must never be presented as real Fabric
  proof.
- Real Fabric proof requires chaincode or gateway verification evidence. A
  pending, unavailable, failed, or mock anchor is not equivalent to a verified
  proof.

## Actor Groups

The actor groups for this reference are listed exactly as required for this
documentation slice.

| Actor group | Scope |
| --- | --- |
| SME Owner/Admin | Manages organization setup, users, roles, deployment settings, integrations, backup readiness, and network participation decisions. |
| Procurement Officer | Creates and manages supplier records, requisitions, RFQs, quotations, POs, receipts, invoices, evidence packs, and procurement execution records. |
| Approver/Manager | Reviews business justification, budget, supplier selection, purchase orders, financing requests, and exception approvals. |
| Supplier/Sales User / SME Supplier/Mudarib | Responds to sourcing events, acknowledges POs, provides delivery and invoice evidence, publishes eligible procurement opportunities, and applies for restricted mudarabah capital. |
| Finance/Accountant | Reconciles procurement and accounting records, invoices, payments, project accounts, allowable costs, profit/loss calculations, ERP postings, and closure evidence. |
| Financial Entity Investment Officer/User | Reviews financing applications, performs due diligence, assesses risk and project economics, approves or rejects capital commitment, monitors milestones, and handles contract/disbursement activities. |
| Shariah/Compliance Reviewer | Reviews goods/services eligibility, contract form, profit ratio, loss treatment, allowed expenses, compliance exceptions, and evidence packs. |
| Auditor | Reviews read-only evidence, event logs, hashes, Fabric references, user actions, workflow history, and closure packages. |
| Developer/Integrator | Builds adapters, API integrations, deployment automation, Fabric gateway integration, testing support, and custom extensions. |
| External Systems | Includes identity providers, ERP/accounting systems, object storage, email/queue infrastructure, e-signature services, payment APIs, webhook subscribers, graph/audit services, and optional Fabric gateway infrastructure. |

## UC-01 - Install And Configure SME Node

| Field | Specification |
| --- | --- |
| Primary actor | SME Owner/Admin |
| Supporting actors | Developer/Integrator, Identity Provider, ERP system |
| Goal | Deploy a functioning self-hosted or managed organization node. |
| Preconditions | Installation package is available; administrator has infrastructure and organization details. |
| Trigger | Administrator starts first-run setup. |
| Main success scenario | 1. Launch deployment. 2. Create organization profile. 3. Configure identity provider. 4. Configure database, object storage, email, and queue. 5. Create administrator role. 6. Run health checks. 7. Enable backup schedule. |
| Alternate/exception flows | A1: Identity provider unavailable - administrator uses local bootstrap admin and completes IdP configuration later. A2: ERP not ready - node operates without ERP adapter. |
| Postconditions | Organization node is operational, audited, and ready for procurement setup. |
| Related requirements | FR-01, FR-02, FR-03, FR-57--FR-60, NFR-10, NFR-19, NFR-25--NFR-27 |

## UC-02 - Authenticate And Authorize User

| Field | Specification |
| --- | --- |
| Primary actor | Any human user |
| Supporting actors | OAuth/OIDC identity provider, API gateway |
| Goal | Access authorized system functions with correct organization context. |
| Preconditions | User exists in IdP or local invite workflow; organization role exists. |
| Trigger | User opens the web application. |
| Main success scenario | 1. User starts login. 2. System redirects to IdP. 3. User authenticates. 4. System validates tokens. 5. System maps claims to organization roles. 6. Authorized landing page is shown. |
| Alternate/exception flows | A1: Invalid token - request is rejected. A2: Missing role - user sees no-access page and audit event is created. |
| Postconditions | Session is established with role-scoped permissions or access is denied. |
| Related requirements | FR-02, FR-03, FR-05, IR-02, IR-03, NFR-08 |

## UC-03 - Onboard Supplier

| Field | Specification |
| --- | --- |
| Primary actor | Procurement Officer |
| Supporting actors | Supplier User, Finance/Accountant, Shariah Reviewer |
| Goal | Create an approved supplier record with risk and compliance evidence. |
| Preconditions | Procurement officer has supplier management rights. |
| Trigger | A new supplier is required or a supplier responds to an invitation. |
| Main success scenario | 1. Create supplier profile. 2. Request documents. 3. Supplier submits registration, bank, tax, certification, and Shariah information. 4. System validates completeness. 5. Reviewer approves, rejects, or requests changes. 6. Supplier becomes available for sourcing. |
| Alternate/exception flows | A1: Bank details mismatch - supplier is blocked for payment use. A2: Shariah eligibility unresolved - supplier can be marked restricted. |
| Postconditions | Supplier has status, evidence, and approval history. |
| Related requirements | FR-19, FR-20, DR-08, NFR-16 |

## UC-04 - Run RFQ And Supplier Evaluation

| Field | Specification |
| --- | --- |
| Primary actor | Procurement Officer |
| Supporting actors | Supplier User, Approver/Manager |
| Goal | Select a supplier through controlled sourcing. |
| Preconditions | Approved requisition or sourcing need exists. |
| Trigger | Procurement officer creates RFQ/RFP/tender. |
| Main success scenario | 1. Create RFQ from requirement. 2. Invite suppliers. 3. Suppliers submit quotations. 4. System compares quotations. 5. Procurement officer recommends award. 6. Approver approves. 7. Award record is stored. |
| Alternate/exception flows | A1: Supplier misses deadline - quotation is excluded unless authorized exception. A2: Conflict of interest flag - additional approval required. |
| Postconditions | Approved supplier quotation or award exists for PO creation and optional financing evidence. |
| Related requirements | FR-11, FR-12, FR-13, FR-23 |

## UC-05 - Execute Procure-To-Pay Workflow

| Field | Specification |
| --- | --- |
| Primary actor | Procurement Officer |
| Supporting actors | Approver/Manager, Supplier User, Finance/Accountant, ERP system |
| Goal | Create and close a purchase transaction with matching evidence. |
| Preconditions | Approved requisition or quotation exists; supplier is approved. |
| Trigger | Purchase order is created. |
| Main success scenario | 1. Generate PO. 2. Route for approval. 3. Supplier acknowledges. 4. Goods or services are received. 5. Supplier submits invoice. 6. System performs three-way match. 7. Finance approves payment status or ERP posting. 8. PO is completed or closed. |
| Alternate/exception flows | A1: Match exception - invoice enters exception workflow. A2: Partial delivery - PO remains partially received. A3: Supplier on hold - PO submission blocked. |
| Postconditions | Procurement transaction has auditable document chain and ERP reconciliation status. |
| Related requirements | FR-09 to FR-18, IR-05, IR-06 |

## UC-06 - Publish Procurement Opportunity For Financing

| Field | Specification |
| --- | --- |
| Primary actor | SME Supplier/Mudarib |
| Supporting actors | Buyer, Procurement Officer, Finance/Accountant |
| Goal | Create a revenue-generating procurement opportunity that can be financed. |
| Preconditions | Buyer PO, sales order, tender award, or contract evidence exists. |
| Trigger | Mudarib needs capital to execute the opportunity. |
| Main success scenario | 1. Create opportunity record. 2. Attach buyer demand evidence. 3. Add expected revenue, supplier plan, cost budget, delivery timeline, risk assumptions, and requested capital. 4. System checks suitability. 5. Opportunity is submitted for financing. |
| Alternate/exception flows | A1: Opportunity is internal consumption - system blocks mudarabah submission. A2: Evidence missing - application remains draft. |
| Postconditions | Opportunity is ready for financier invitation or internal review. |
| Related requirements | FR-25, FR-26, FR-27, FR-28 |

## UC-07 - Apply For Mudarabah Capital

| Field | Specification |
| --- | --- |
| Primary actor | SME Supplier/Mudarib |
| Supporting actors | Financial Entity User, Shariah Reviewer |
| Goal | Submit a complete capital application for restricted mudarabah financing. |
| Preconditions | Procurement opportunity exists and passes suitability checks. |
| Trigger | Mudarib sends application to a financial entity. |
| Main success scenario | 1. Select financier. 2. Confirm requested capital and profit ratio proposal. 3. Submit evidence checklist. 4. System creates restricted workspace. 5. Financial entity receives application notification. |
| Alternate/exception flows | A1: Financier policy requires extra documents - system requests additional evidence. A2: Profit ratio omitted - submission blocked. |
| Postconditions | Application is in submitted state with audit record and workspace access. |
| Related requirements | FR-26, FR-28, FR-29, FR-41 |

## UC-08 - Perform Financier Due Diligence

| Field | Specification |
| --- | --- |
| Primary actor | Financial Entity Investment Officer |
| Supporting actors | SME Supplier/Mudarib, Buyer, Supplier, ERP system |
| Goal | Assess commercial viability and risk of the application. |
| Preconditions | Application is submitted and reviewer has workspace access. |
| Trigger | Investment officer opens due diligence task. |
| Main success scenario | 1. Review buyer evidence. 2. Review supplier plan and quotations. 3. Review project economics. 4. Review ERP/accounting history. 5. Record findings and conditions. 6. Approve, reject, or request changes. |
| Alternate/exception flows | A1: Buyer cannot be verified - application is rejected or paused. A2: Cost budget unreasonable - application returns for revision. |
| Postconditions | Due diligence decision is recorded with evidence and conditions. |
| Related requirements | FR-29, FR-41, DR-07 |

## UC-09 - Perform Shariah And Compliance Review

| Field | Specification |
| --- | --- |
| Primary actor | Shariah/Compliance Reviewer |
| Supporting actors | Financial Entity User, SME Supplier/Mudarib |
| Goal | Validate contract eligibility and compliance controls. |
| Preconditions | Application and due diligence evidence are available. |
| Trigger | Reviewer receives Shariah/compliance review task. |
| Main success scenario | 1. Review goods/services. 2. Review buyer and supplier restrictions. 3. Review profit ratio. 4. Review loss and negligence clauses. 5. Review allowed expenses. 6. Approve, reject, or request amendments. |
| Alternate/exception flows | A1: Goods/services not eligible - application rejected. A2: Profit term implies guaranteed fixed return - amendment required. |
| Postconditions | Compliance decision and checklist are stored. |
| Related requirements | FR-30, FR-31, FR-32 |

## UC-10 - Execute Mudarabah Contract And Disburse Capital

| Field | Specification |
| --- | --- |
| Primary actor | Financial Entity User |
| Supporting actors | SME Supplier/Mudarib, Shariah Reviewer, E-signature provider, Payment API |
| Goal | Create binding contract record and release capital under approved controls. |
| Preconditions | Due diligence and Shariah review are approved. |
| Trigger | Financial entity initiates contract execution. |
| Main success scenario | 1. Generate contract from approved terms. 2. Parties review. 3. Parties sign. 4. System locks contract version. 5. Financial entity chooses disbursement method. 6. Disbursement is recorded and optionally sent to payment API. 7. Audit/Fabric event is created. |
| Alternate/exception flows | A1: Signature rejected - contract returns for correction. A2: Payment API unavailable - disbursement instruction is queued or manually recorded. |
| Postconditions | Contract is executed and capital release status is recorded. |
| Related requirements | FR-32, FR-33, FR-34, FR-47, FR-48 |

## UC-11 - Monitor Procurement Execution

| Field | Specification |
| --- | --- |
| Primary actor | Financial Entity User |
| Supporting actors | SME Supplier/Mudarib, Procurement Officer, Supplier User, Buyer |
| Goal | Track milestones without interfering with mudarib management. |
| Preconditions | Contract executed and project ledger active. |
| Trigger | Procurement execution begins or milestone changes. |
| Main success scenario | 1. System imports or records POs, receipts, invoices, payments, and exceptions. 2. Dashboard updates milestone and risk status. 3. User reviews variances. 4. Evidence requests are issued if needed. 5. Critical events are anchored. |
| Alternate/exception flows | A1: Delivery delay - risk flag and notification. A2: Cost overrun - approval or amendment workflow. A3: Missing receipt - profit calculation blocked. |
| Postconditions | Project status and evidence are current. |
| Related requirements | FR-35, FR-36, FR-40, FR-47, FR-49 |

## UC-12 - Calculate Profit/Loss And Close Mudarabah Project

| Field | Specification |
| --- | --- |
| Primary actor | Finance/Accountant |
| Supporting actors | Financial Entity User, SME Supplier/Mudarib, Shariah Reviewer, Auditor |
| Goal | Compute and approve project outcome and distribution. |
| Preconditions | Revenue, cost, payment, and expense evidence is complete or waived. |
| Trigger | Buyer payment is received or project closure is requested. |
| Main success scenario | 1. System compiles project ledger. 2. System calculates allowable costs. 3. System calculates net profit or loss. 4. Reviewers verify calculation. 5. Profit is distributed by approved ratio or loss workflow is started. 6. Closure pack is generated. 7. Contract is closed. |
| Alternate/exception flows | A1: Loss detected - loss exception workflow determines genuine loss vs breach. A2: Expense disputed - calculation paused pending resolution. |
| Postconditions | Project is closed with auditable calculation and distribution or loss decision. |
| Related requirements | FR-35, FR-37, FR-38, FR-39, FR-42 |

## UC-13 - Use Supply-Chain Network Canvas

| Field | Specification |
| --- | --- |
| Primary actor | Procurement Officer or Financial Entity User |
| Supporting actors | Graph service, audit service |
| Goal | Visualize relationships, status, risk, and finance dependencies. |
| Preconditions | User has graph view permission. |
| Trigger | User opens network canvas. |
| Main success scenario | 1. System loads authorized graph nodes and edges. 2. User filters by organization, supplier, opportunity, status, risk, or financing phase. 3. User expands node details. 4. User adds comments or annotations. 5. System saves view snapshot. |
| Alternate/exception flows | A1: User lacks permission - node metadata is redacted. A2: Graph query is large - system prompts filter refinement. |
| Postconditions | User obtains authorized network visibility without exposing unauthorized data. |
| Related requirements | FR-43, FR-44, FR-45, FR-46 |

## UC-14 - Verify Audit Event And Evidence Pack

| Field | Specification |
| --- | --- |
| Primary actor | Auditor |
| Supporting actors | Fabric Gateway, Audit Service, Object Storage |
| Goal | Confirm that a document or event matches stored system and Fabric evidence. |
| Preconditions | Auditor has read-only access to evidence pack. |
| Trigger | Audit review begins or dispute arises. |
| Main success scenario | 1. Auditor opens evidence pack. 2. System shows document version, hash, workflow history, user actions, and Fabric transaction reference. 3. Auditor verifies hash. 4. System retrieves Fabric transaction metadata. 5. Auditor records finding. |
| Alternate/exception flows | A1: Fabric unavailable - local evidence is shown and chain verification marked pending. A2: Hash mismatch - exception is raised. |
| Postconditions | Audit verification status is recorded. |
| Related requirements | FR-47, FR-48, FR-50, FR-42 |

## UC-15 - Integrate ERP/Accounting Records

| Field | Specification |
| --- | --- |
| Primary actor | Developer/Integrator |
| Supporting actors | ERP system, Finance/Accountant, API Gateway |
| Goal | Synchronize procurement and project-accounting records between systems. |
| Preconditions | ERP adapter is configured and credentials are approved. |
| Trigger | A procurement or finance event requires external posting or import. |
| Main success scenario | 1. Adapter maps master data. 2. System sends or receives document event. 3. Adapter validates idempotency key. 4. ERP confirms result. 5. System records reconciliation status. 6. Exceptions are queued for correction. |
| Alternate/exception flows | A1: ERP rejects posting - exception task is created. A2: Duplicate event - adapter returns existing result. |
| Postconditions | Records are synchronized or exception is visible. |
| Related requirements | IR-05, IR-06, FR-36, NFR-11 |

## Suggested New Use Cases

The following use cases are suggested additions for release operations and
network onboarding. They are not implementation-status claims.

| UC | Suggested name | Primary actor | Goal | Boundary notes |
| --- | --- | --- | --- | --- |
| UC-16 | Verify release package and update local node | SME Owner/Admin | Confirm a release package is authentic, compatible, backed up, and safe to apply to a local/self-hosted node. | Should include manifest verification, backup confirmation, health checks, rollback readiness, and post-update smoke checks. |
| UC-17 | Import network/channel join package | SME Owner/Admin | Import a non-secret network or channel join package so the organization can participate in an approved network workflow. | Must not expose or store channel-admin private keys as normal application data. Must not directly create channels or join organizations from core workflows. |
| UC-18 | Check node and channel compatibility | Developer/Integrator | Check whether local node configuration, chaincode expectations, Fabric gateway settings, channel metadata, and network policy are compatible before proof operations. | Should report missing or incompatible settings without leaking secrets and without claiming proof verification before real gateway or chaincode evidence exists. |

