# Software Design Description
Mudarabah-Enabled Procurement Network
Product codename: MEPN

| Field | Value |
| --- | --- |
| Document status: | Draft for Final Year Project design planning |
| Version: | 1.0 |
| Date: | 2 June 2026 |
| Conceptual standard: | ISO/IEC/IEEE 42010 architecture description concepts |
| Document structure: | arc42-aligned with IEEE 1016 SDD content |
| Diagram notation: | C4 model using context, container, and component views |
| Source SRS: | Software Requirements Specification for MEPN, Version 1.0 |

This Software Design Description translates the MEPN SRS into an architecture and software design baseline. It is an academic/product design artifact, not a legal contract, Shariah ruling, production security certification, or regulatory approval.

# Document Control

| **Item** | **Value** |
| --- | --- |
| System of interest | Mudarabah-Enabled Procurement Network (MEPN) |
| Document version | 1.0 |
| Design baseline | MEPN SRS Version 1.0, architecture preparation notes, uploaded standards/templates, and FYP product vision |
| Intended readers | Product owner, software architect, developers, QA engineers, DevOps engineers, SME administrators, financial entity reviewers, Shariah/compliance reviewers, auditors, and academic assessors |
| Repository target | `raichiiiiiii/FYP`, path `docs/design/mepn_software_design_description.tex` |

## Standards and Method Tailoring
This document combines ISO/IEC/IEEE 42010 as the conceptual model, arc42 as the practical architecture-document structure, C4 as the diagram hierarchy, and IEEE 1016 as the formal SDD lens. It identifies stakeholders, concerns, viewpoints, views, design entities, interfaces, data, runtime behavior, deployment, quality attributes, architecture rationale, and traceability.

# Purpose and Scope
The purpose of this SDD is to specify the software architecture and design baseline for MEPN, a distributed e-procurement platform that allows SME organizations to automate procurement workflows and obtain project-based mudarabah capital from approved financial entities.

## Scope
The design covers e-procurement workflows, restricted mudarabah finance workflows, scoped cross-organization collaboration, supply-chain graph/canvas visibility, ERP/accounting integration, e-signature integration, financial entity API integration, Hyperledger Fabric audit anchoring, evidence pack export, Docker Compose deployment, backup/restore, observability, and security architecture.

## Out of Scope
Full banking-core replacement, autonomous Shariah/legal rulings, public blockchain settlement, production regulatory reporting, and production penetration-test certification are outside this SDD.

# Business Context / Problem Statement
Traditional procurement creates friction through manual approvals, fragmented supplier records, disconnected ERP screens, invoice exceptions, maverick spending, contract leakage, poor spend visibility, and weak auditability. Mudarabah finance adds agency risk and profit-verification cost. MEPN addresses both issues by making procurement workflow records the trusted evidence layer for restricted mudarabah: buyer contracts, supplier quotations, purchase orders, receipts, invoices, payments, project ledgers, reviewer decisions, Fabric anchors, and closure packs become the data basis for financier review and profit/loss verification.

# Requirements and Constraints

## Functional Requirement Groups

| **Group** | **Design interpretation** | **SRS IDs** |
| --- | --- | --- |
| Identity and administration | Organization profile, OAuth/OIDC, RBAC, workspace scopes, API clients, invitations, emergency access, identity audit events. | `FR-01–FR-08` |
| Procurement core | Requisition, approval, RFQ/RFP/tender, quotation, purchase order, receipt, invoice matching, supplier onboarding, supplier performance, spend analytics, contracts, catalogs. | `FR-09–FR-24` |
| Mudarabah finance | Procurement opportunity, capital application, evidence checklist, due diligence, Shariah review, restricted contract, e-signature, disbursement, ledger, profit/loss, distribution, loss exception, closure pack. | `FR-25–FR-42` |
| Network, audit, extension | Graph/canvas, node/edge access control, append-only audit, Fabric anchoring, verification, invitations, extension registry. | `FR-43–FR-52` |
| External interfaces | OpenAPI REST, OAuth/OIDC, ERP sync, CSV/XLSX, Fabric gateway, finance APIs, e-signature, webhooks. | `IR-01–IR-12` |

## Non-Functional Drivers
Performance, scalability, TLS, secret protection, organization isolation, token validation, append-only audit, backup/restore, integration resilience, degraded Fabric mode, observability, localization, accessibility, clear validation, immutable contracts, off-chain confidentiality, Docker Compose deployment, data residency, dependency scanning, evidence export, and plugin sandboxing drive the architecture. These map to `NFR-01–NFR-24`.

## Constraints
SMEs must be able to self-host; financiers require controlled monitoring without taking over SME operations; Fabric is required for communication/audit anchoring but must not store confidential payloads by default; OAuth/OIDC is required; ERP integration must be adapter-based; Shariah/compliance approval is mandatory before restricted contract execution.

# Stakeholders and Concerns

| **Stakeholder** | **Concerns** |
| --- | --- |
| SME owner/admin | Installability, data ownership, users, roles, backups, upgrades, integration settings, operating cost. |
| Procurement officer | Fast requisitions, sourcing, supplier comparison, PO issuance, receipt recording, invoice matching, exception handling. |
| SME finance/accounting user | ERP reconciliation, project ledger integrity, allowable cost rules, profit/loss calculation, payment evidence. |
| Supplier/counterparty | Simple onboarding, quotation submission, PO acknowledgement, delivery evidence, invoice submission, payment status. |
| Financial entity reviewer | Due diligence evidence, buyer/supplier risk, exposure, disbursement state, milestone monitoring, closure packs. |
| Shariah/compliance reviewer | Eligible activity, restricted contract terms, profit ratio, no guaranteed return, loss treatment, breach clauses. |
| Auditor/regulator reviewer | Immutable evidence, audit events, Fabric references, approval history, traceability, closure package. |
| Developer/integrator | Clear module boundaries, APIs, adapters, event contracts, local development, testability. |
| Deployment/Fabric operator | Containerization, health checks, secrets, TLS, Fabric channel configuration, peer/gateway connectivity. |

## Viewpoints and Views

| **Viewpoint** | **Concern addressed** | **Views/models** |
| --- | --- | --- |
| Context | System boundary, actors, integrations. | C4 Context diagram. |
| Container | Deployable units and data stores. | C4 Container diagram. |
| Component | Internal services and responsibilities. | Component diagram and responsibility table. |
| Data | Entity ownership, storage, lineage. | Logical data model and flows. |
| Runtime | Major workflows and integration behavior. | Procurement-to-finance and audit anchoring flows. |
| Security | Authentication, authorization, confidentiality, integrity. | Security architecture and threat table. |
| Deployment | Self-hosting, managed deployments, environment topology. | Deployment architecture. |
| Operations | Logs, metrics, traces, alerts, backups. | Observability and DR design. |
| Rationale | Design alternatives, decisions, consequences. | ADR section and traceability matrix. |

# High-Level Architecture
MEPN uses a distributed, self-hostable modular monolith with explicit bounded contexts, adapter-based integrations, an append-only audit subsystem, a transactional outbox, and optional Hyperledger Fabric anchoring. For MVP, this avoids microservice operational complexity while preserving service boundaries for later extraction.

## Core Principles

1. SME-owned node is the operational system of record for the organization's data.
2. Procurement evidence drives mudarabah due diligence, monitoring, profit/loss calculation, and closure.
3. Full confidential payloads stay off-chain; Fabric anchors hashes and minimal metadata.
4. External systems are unreliable by default; use adapters, retries, idempotency, and reconciliation.
5. Authorization is enforced at gateway, service, and data-access layers.
6. Material business actions create audit events with correlation IDs.

# C4 Context Diagram

> **Figure:** C4 Level 1 Context diagram

<details>
<summary>LaTeX/TikZ source</summary>

```latex
\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=15mm]
\node[c4system] (mepn) {\textbf{MEPN}\\Distributed procurement and mudarabah finance platform};
\node[c4person, above left=of mepn] (sme) {SME users};
\node[c4person, left=of mepn] (supplier) {Suppliers};
\node[c4person, below left=of mepn] (auditor) {Auditors};
\node[c4person, above right=of mepn] (financier) {Financial entities};
\node[c4person, right=of mepn] (shariah) {Shariah / compliance reviewers};
\node[c4external, below right=of mepn] (erp) {ERP / Accounting};
\node[c4external, below=of mepn] (fabric) {Hyperledger Fabric};
\node[c4external, above=of mepn] (idp) {OAuth/OIDC IdP};
\node[c4external, far right=of mepn] (esign) {E-signature / finance APIs};
\draw[c4arrow] (sme) -- (mepn);
\draw[c4arrow] (supplier) -- (mepn);
\draw[c4arrow] (auditor) -- (mepn);
\draw[c4arrow] (financier) -- (mepn);
\draw[c4arrow] (shariah) -- (mepn);
\draw[c4arrow] (mepn) -- (idp);
\draw[c4arrow] (mepn) -- (erp);
\draw[c4arrow] (mepn) -- (fabric);
\draw[c4arrow] (mepn) -- (esign);
\end{tikzpicture}
\caption{C4 Level 1 Context diagram}
\end{figure}
```

</details>

# C4 Container Diagram

> **Figure:** C4 Level 2 Container diagram

<details>
<summary>LaTeX/TikZ source</summary>

```latex
\begin{figure}[H]
\centering
\begin{tikzpicture}[node distance=12mm]
\node[c4container] (web) {Web Application\\Procurement, finance, canvas, audit UI};
\node[c4container, right=of web] (api) {API Gateway / BFF\\REST, OpenAPI, auth enforcement};
\node[c4container, right=of api] (backend) {Backend Application\\Modular domain services};
\node[c4container, right=of backend] (worker) {Workers\\Outbox, ERP, Fabric, e-sign, webhooks};
\node[c4database, below=of backend] (pg) {PostgreSQL\\Operational data};
\node[c4database, below left=of backend] (obj) {Object Storage\\Documents/evidence};
\node[c4database, below right=of backend] (redis) {Redis/Queue\\Retry/cache/locks};
\node[c4database, right=of redis] (search) {Search Index\\Optional analytics};
\node[c4external, below=of web] (idp) {OIDC IdP};
\node[c4external, below=of worker] (external) {ERP, Fabric, finance API, e-signature, webhooks};
\draw[c4arrow] (web) -- (api);
\draw[c4arrow] (api) -- (backend);
\draw[c4arrow] (backend) -- (worker);
\draw[c4arrow] (backend) -- (pg);
\draw[c4arrow] (backend) -- (obj);
\draw[c4arrow] (backend) -- (redis);
\draw[c4arrow] (backend) -- (search);
\draw[c4arrow] (api) -- (idp);
\draw[c4arrow] (worker) -- (external);
\end{tikzpicture}
\caption{C4 Level 2 Container diagram}
\end{figure}
```

</details>

# Key Components and Responsibilities

| **Component** | **Responsibility** | **SRS** |
| --- | --- | --- |
| Identity and Access | Organization, user, role, workspace scope, API clients, invitations, token claims, permission checks. | `FR-01–FR-08` |
| Procurement Core | Requisition, RFQ, quotation, PO, receipt, invoice, matching, contracts, catalogs, spend analytics. | `FR-09–FR-24` |
| Supplier/Counterparty | Supplier onboarding, risk documents, Shariah eligibility, bank metadata, performance scores. | `FR-19–FR-20` |
| Mudarabah Finance | Opportunity, capital application, due diligence, Shariah review, contract, disbursement, ledger, P/L, closure. | `FR-25–FR-42` |
| Policy/Rule Engine | Approval matrix, evidence checklist, financier policy, Shariah checklist, rule versioning. | `FR-04,FR-28,FR-30,FR-41` |
| Evidence/Documents | Document metadata, immutable versions, object-store references, hashes, PDF/JSON packs. | `DR-04,NFR-23` |
| Audit/Fabric | Append-only audit, canonical hash, Fabric anchor request, transaction reference, verification. | `FR-47–FR-50` |
| Graph/Canvas | Nodes, edges, annotations, status/risk overlays, authorization-aware graph views. | `FR-43–FR-46` |
| Integration Adapters | ERP, financial entity API, e-signature, CSV/XLSX, webhooks, idempotency, reconciliation. | `IR-05–IR-12` |
| Observability/Ops | Health checks, logs, metrics, traces, alerts, backup/restore diagnostics. | `NFR-10,NFR-13` |

# Data Model and Data Flow

## Data Stores
PostgreSQL is the transactional source of truth. Object storage holds document payloads, signed artifacts, and evidence packs. Redis/queue infrastructure handles retry state, locks, cache, and background jobs. Fabric stores event hashes and minimal metadata only.

## Logical Entity Groups

| Field | Value |
| --- | --- |
| **Area** | **Entities** |
| Identity | Organization, User, Role, Permission, Membership, Workspace, Invitation, APIClient, EmergencyAccessGrant. |
| Procurement | Project, Requisition, RFQ, Quotation, PurchaseOrder, Receipt, ServiceConfirmation, Invoice, PaymentRecord, ProcurementContract, CatalogItem. |
| Mudarabah finance | ProcurementOpportunity, MudarabahApplication, EvidenceChecklist, DueDiligenceReport, ShariahReview, MudarabahContract, Disbursement, ProjectLedgerEntry, ProfitLossStatement, ProfitDistribution, LossException, ClosurePack. |
| Evidence/audit | Document, DocumentVersion, EvidenceItem, EvidencePack, HashRecord, AuditEvent, AuditAnchor, FabricTransactionRef. |
| Graph | NetworkNode, NetworkEdge, VisibilityRule, CanvasView, CanvasAnnotation, RiskOverlay. |
| Integration | ERPMapping, ExternalReference, ReconciliationStatus, OutboxEvent, WebhookSubscription, WebhookDelivery, ImportJob, ExportJob. |

## Major Data Flow
Buyer contract or sales order creates a procurement opportunity. The opportunity generates an evidence checklist and mudarabah capital application. Financier and Shariah reviewers approve or reject. Approved applications generate a restricted contract and e-signature package. Controlled disbursement funds procurement execution. Purchase orders, receipts, invoices, payments, ERP postings, and buyer revenue update the project ledger. Profit/loss is calculated from linked evidence. Closure pack export includes contract, approvals, ledger, distribution/loss decision, audit events, and Fabric anchors.

# APIs and Integration Points

| **API group** | **Example endpoints** | **Purpose** |
| --- | --- | --- |
| Organization | `/api/v1/orgs`, `/users`, `/roles`, `/workspaces`, `/api-clients` | Organization and access setup. |
| Procurement | `/requisitions`, `/rfqs`, `/quotations`, `/purchase-orders`, `/receipts`, `/invoices`, `/matching` | Source-to-pay workflows. |
| Supplier | `/suppliers`, `/supplier-documents`, `/supplier-scores` | Supplier data and performance. |
| Mudarabah finance | `/opportunities`, `/applications`, `/due-diligence`, `/shariah-reviews`, `/contracts`, `/disbursements`, `/project-ledgers`, `/profit-loss`, `/closures` | Financing workflow. |
| Graph | `/graph/nodes`, `/graph/edges`, `/canvas/views`, `/canvas/annotations` | Network canvas. |
| Audit/evidence | `/audit-events`, `/anchors`, `/verify`, `/evidence-packs` | Audit and export. |
| Integrations | `/integrations/erp`, `/integrations/fabric`, `/integrations/finance`, `/integrations/esign`, `/webhooks` | External systems. |

External integrations include OAuth/OIDC IdP, ERP/accounting, CSV/XLSX import/export, Hyperledger Fabric Gateway, financial entity API, e-signature provider, and webhook subscribers. All outbound integrations use adapters, idempotency keys, retry state, and reconciliation records.

# Security Architecture
Users authenticate through OAuth/OIDC. Authorization combines organization membership, role, workspace scope, object ownership, object state, and policy conditions. TLS protects all browser, API, ERP, finance API, e-signature, and Fabric gateway traffic. Secrets are held in a secrets store or deployment-approved equivalent. Confidential payloads are stored off-chain; Fabric receives hashes and minimum metadata only.

| **Threat** | **Mitigation** | **SRS** |
| --- | --- | --- |
| Unauthorized financier access | Workspace scopes, graph edge visibility rules, API/service/data authorization, audit denied access. | `FR-06,FR-46,NFR-07` |
| Invalid or replayed tokens | Validate issuer, audience, expiry, signature, nonce/scopes, and TLS. | `FR-02,NFR-08` |
| Contract tampering | Immutable versions, amendment workflow, hash verification, Fabric anchors. | `FR-32,NFR-17,FR-50` |
| Duplicate disbursement | Idempotency, outbox state, external references, reconciliation. | `FR-34,NFR-11` |
| Payload leakage to Fabric | Hash-only/minimal metadata default; no full supplier bank details on chain. | `DR-05,NFR-18` |
| Lost SME data | Backups, restore tests, migration versioning, object storage backup. | `NFR-10` |

# Scalability and Performance Design
Interactive pages use pagination, server-side filtering, cached reference data, and asynchronous export jobs. Workflow transitions commit local state and audit/outbox events quickly while deferring ERP/Fabric/e-sign/finance API effects to workers. PostgreSQL indexes organization, workspace, status, project, supplier, document number, lifecycle date, and audit correlation IDs. Search indexes and materialized views can support audit search and analytics. Graph/canvas loads filtered visible subgraphs rather than the full network.

# Reliability, Availability, Backup, and Disaster Recovery
The system continues core local procurement when Fabric is unavailable and shows pending-anchor status. ERP, finance API, e-signature, and webhook integrations use retry and idempotency. Backup sets include PostgreSQL, object storage, configuration, secret references, migration version, and integration state. SME self-hosted deployments target RPO 24 hours and RTO 8 hours, matching the SRS.

# Deployment Architecture
Docker Compose is the MVP deployment baseline. Deployment units are reverse proxy, frontend container, backend API container, worker container, PostgreSQL, object storage, Redis/queue, optional search index, and backup job. Helm/Kubernetes is a future managed-deployment option for financial entities or consortium operators.

# Observability: Logs, Metrics, Tracing, Alerts
Logs are structured and include timestamp, service, module, correlation ID, actor, organization/workspace when allowed, event type, and error code. Metrics include request latency, workflow transition duration, queue depth, retry count, database pool state, object store errors, adapter failures, pending anchor age, backup status, and authorization denials. Traces follow requests through API, domain services, database, outbox, workers, and external adapters. Alerts cover high 5xx rate, queue backlog, Fabric anchors stuck, ERP sync failures, object storage failures, and failed backups.

# Risks, Assumptions, and Trade-offs

| **Risk/trade-off** | **Implication** | **Mitigation** |
| --- | --- | --- |
| Mudarabah legal/Shariah variation | Templates differ by institution and jurisdiction. | Configurable templates and human approval. |
| Fabric governance complexity | SMEs may struggle to run peers/orderers/CA. | Managed consortium option and optional anchoring mode. |
| Financial APIs unavailable | Banks/VCs may not expose APIs. | Evidence packs and manual status fallback. |
| Data quality weakness | P/L may be unreliable if procurement evidence is incomplete. | Checklists, validation, ERP reconciliation, auditable waivers. |
| Modular monolith coupling | Boundaries may erode over time. | Module dependency rules, tests, ADRs, extraction criteria. |
| Graph data leakage | Network visibility may expose confidential relationships. | Edge-level access control and scoped read models. |

# Architecture Decisions / ADRs

| **ADR** | **Decision** | **Rationale** | **Mapped SRS** |
| --- | --- | --- | --- |
| `ADR-001` | Modular monolith for MVP | Easier SME installation and transactional consistency; keep strict bounded contexts for later extraction. | `BR-05,NFR-19` |
| `ADR-002` | SME-owned node | Supports distributed ownership, data sovereignty, and self-hostability. | `BR-05,NFR-21` |
| `ADR-003` | PostgreSQL + object storage | Relational workflow state plus scalable document/evidence payload storage. | `DR-01–DR-10,NFR-23` |
| `ADR-004` | Outbox/idempotency | Prevent duplicate effects and tolerate external failures. | `NFR-11,FR-49,IR-06` |
| `ADR-005` | OAuth/OIDC + RBAC + workspace scopes | Standards-based identity and controlled financier access. | `FR-02,FR-03,FR-06,NFR-08` |
| `ADR-006` | Hash-only Fabric anchoring | Tamper-evident audit while preserving confidentiality. | `FR-48,DR-05,NFR-18` |
| `ADR-007` | Procurement evidence drives finance | Reduces agency risk and profit-verification cost. | `FR-25–FR-42,DR-07` |
| `ADR-008` | Separate procurement and finance contexts | Distinct lifecycles, rules, and stakeholders. | `FR-09–FR-42` |
| `ADR-009` | Adapter layer for external systems | Protects domain model from ERP/bank/e-sign variation. | `IR-05–IR-12` |
| `ADR-010` | Docker Compose first | Practical for SMEs and FYP prototype; Helm later. | `NFR-19,NFR-20` |

# Open Questions

| **ID** | **Question** | **Owner** |
| --- | --- | --- |
| OQ-01 | Which implementation stack will be used for frontend, backend, workers, and migrations? | Technical lead |
| OQ-02 | Which financial entity APIs will be integrated first? | Product owner |
| OQ-03 | What exact Shariah checklist and legal templates are approved for restricted mudarabah contracts? | Shariah/legal advisors |
| OQ-04 | Who operates Fabric peers, orderers, CA/MSP, and chaincode lifecycle in pilots? | Consortium/operator |
| OQ-05 | Which ERP/accounting adapter is first-class in MVP? | Integrator |
| OQ-06 | What retention periods and legal-hold policies apply by jurisdiction? | Compliance |
| OQ-07 | What evidence is sufficient to classify loss as genuine commercial loss versus negligence or breach? | Finance/Shariah/legal |
| OQ-08 | Is PostgreSQL row-level security mandatory for MVP? | Security architect |
| OQ-09 | Which graph/canvas library will be used? | Frontend architect |
| OQ-10 | What plugin sandbox mechanism is required for future extensions? | Architect/security |

# Traceability from SRS to Design Decisions

| **SRS IDs** | **Design response** | **Decision/component mapping** |
| --- | --- | --- |
| `BR-01,FR-09–FR-24` | Procurement Core automates source-to-contract and procure-to-pay. | Procurement Core, `ADR-001`, `ADR-008` |
| `BR-02,FR-25–FR-42` | Mudarabah Finance manages application, review, contract, disbursement, ledger, P/L, closure. | Finance Service, `ADR-007`, `ADR-008` |
| `BR-03,DR-07` | Evidence lineage links procurement records, ERP postings, reviewer decisions, and P/L calculations. | Evidence/Documents, Project Ledger, `ADR-007` |
| `BR-04,FR-30–FR-32` | Policy engine blocks contract generation until financier and Shariah approvals or authorized waivers exist. | Policy Engine, Finance Service |
| `BR-05,NFR-19–NFR-21` | SME-owned deployment, Docker Compose baseline, future Helm. | Deployment architecture, `ADR-002`, `ADR-010` |
| `BR-06,FR-06,FR-51` | Bounded opportunity workspaces and invitations. | Identity/Access, `ADR-005` |
| `BR-07,FR-47–FR-50` | Audit service and Fabric adapter anchor hashes and verify transactions. | Audit/Fabric, `ADR-006` |
| `BR-08,FR-42,NFR-23` | PDF/JSON closure and evidence packs. | Evidence/Documents, Reporting |
| `BR-09,FR-43–FR-46` | Authorization-aware graph/canvas. | Graph/Canvas |
| `BR-10,FR-52,IR-01,IR-12` | Versioned APIs, webhooks, extension registry. | API Gateway, Integration, Extension Registry |
| `NFR-01–NFR-04` | Pagination, indexing, async workers, optional search. | Scalability/performance design |
| `NFR-05–NFR-09` | TLS, secrets, data isolation, token validation, append-only audit. | Security architecture |
| `NFR-10–NFR-13` | Backup/restore, integration retry, degraded Fabric mode, observability. | Reliability and observability |

# Glossary

- **ADR:** Architecture Decision Record.
- **C4:** Context, Container, Component, and Code diagram hierarchy for software architecture.
- **Fabric anchor:** Hyperledger Fabric transaction containing event/document hash and minimal metadata.
- **Mudarabah:** Islamic partnership where the capital provider supplies capital and the entrepreneur/operator manages the venture, with profit shared by ratio and genuine loss borne by capital unless breach/negligence/fraud applies.
- **Outbox:** Durable integration event store used for retryable external side effects.
- **Workspace scope:** Authorization boundary for a selected opportunity, project, or cross-organization collaboration area.

# References

1. **[iso42010]** ISO/IEC/IEEE 42010:2011, *Systems and software engineering – Architecture description*.
2. **[ieee1016]** IEEE Std 1016-2009, *IEEE Standard for Information Technology – Systems Design – Software Design Descriptions*.
3. **[arc42]** arc42, *Template for software architecture documentation*, uploaded LaTeX template.
4. **[c4]** Simon Brown, *The C4 model*, uploaded slide deck.
5. **[adrnotes]** Richard Thomas, *Architectural Decision Records*, uploaded lecture notes.
6. **[srs]** *Software Requirements Specification: Mudarabah-Enabled Distributed E-Procurement System*, Version 1.0.
7. **[procurement]** *Inefficiencies in Traditional Procurement and the Performance Impact of Digital Procurement Solutions*, uploaded evidence review.
8. **[mudarabahproc]** *Understanding the Link between Mudarabah and Procurement*, uploaded conceptual thesis.
9. **[mudarabahmalaysia]** *Mudarabah Performance Research Report – Malaysia*, uploaded research synthesis.
