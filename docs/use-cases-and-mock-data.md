# MEPN Use Cases And Mock Data Blueprint

## Purpose

This document defines realistic review/demo use cases for MEPN and derives a
mock data set that can be seeded later. The data should support UI workflow
documentation, UAT, screenshots, and prototype demonstrations.

The mock data is fictional, but it is based on a plausible Malaysian SME
procurement and restricted mudarabah financing scenario.

## Scenario Summary

TechBuild Energy Sdn Bhd is an SME contractor that has won a buyer purchase
order from SolarTech Industries Sdn Bhd to supply and install rooftop solar
components for a commercial facility.

TechBuild needs restricted working capital to purchase solar panels, mounting
hardware, and inverter units from approved suppliers. Amanah Islamic Bank acts
as the capital provider. The financing is structured as a restricted mudarabah
arrangement where capital usage is tied to the specific procurement opportunity
and profit distribution is based on actual project outcome, not a fixed
guaranteed return.

## Main Organizations

| Organization | Role In Network | Notes |
|---|---|---|
| TechBuild Energy Sdn Bhd | SME / mudarib / procurement owner | Main organization using MEPN |
| SolarTech Industries Sdn Bhd | Buyer / customer | Issues buyer PO or contract award |
| Mega Components Sdn Bhd | Approved supplier | Supplies solar panels |
| TechParts Asia Sdn Bhd | Approved supplier | Supplies inverter units |
| Struktur Steel Bhd | Approved supplier | Supplies mounting hardware |
| Amanah Islamic Bank | Financier / rabb-ul-mal | Reviews and funds eligible opportunity |
| Independent Shariah Advisory Panel | Shariah/compliance reviewer | Reviews restricted use, profit ratio, and loss treatment |

## Demo Users

| User | Email | Role | Organization |
|---|---|---|---|
| Aisha Rahman | `aisha.admin@techbuild.example` | SME Admin | TechBuild Energy |
| Ahmad Razali | `ahmad.procurement@techbuild.example` | Procurement Officer | TechBuild Energy |
| Nurul Izzah | `nurul.approver@techbuild.example` | Approver | TechBuild Energy |
| Farah Zain | `farah.finance@techbuild.example` | Finance/Accountant | TechBuild Energy |
| Omar Farouq | `omar.reviewer@amanah.example` | Financial Entity Reviewer | Amanah Islamic Bank |
| Dr. Hassan Malik | `hassan.shariah@panel.example` | Shariah/Compliance Reviewer | Advisory Panel |
| Lina Wong | `lina.auditor@audit.example` | Auditor | Independent Audit Reviewer |

## Use Case 1 - Organization Setup And Access

### Goal

Show that MEPN works inside an organization boundary with users, roles,
memberships, workspaces, and audit events.

### Flow

1. SME Admin creates TechBuild Energy Sdn Bhd.
2. Admin creates users for procurement, approval, finance, and audit review.
3. Admin assigns roles and workspace access.
4. The dashboard changes based on the active role.
5. Unauthorized routes show access denied.

### Mock Data

| Entity | Suggested Value |
|---|---|
| Organization legal name | TechBuild Energy Sdn Bhd |
| Registration number | `202001234567` |
| Tax identifier | `MY-TAX-889102` |
| Deployment mode | `standalone_sme` |
| Workspace | `SolarTech Rooftop Solar Project` |
| Initial audit event | `ORGANIZATION_CREATED` |

## Use Case 2 - Procurement Source-To-Pay

### Goal

Show that financing starts from real procurement records rather than free-text
capital requests.

### Flow

1. Procurement officer creates a project.
2. Procurement officer creates a requisition for solar components.
3. Approver approves the requisition.
4. Procurement officer creates an RFQ.
5. Supplier quotations are recorded.
6. Procurement officer creates and issues purchase orders.
7. Receipts and invoices are recorded.
8. Procurement timeline and audit events show the lifecycle.

### Mock Procurement Records

| Entity | Suggested Value |
|---|---|
| Project | `PRJ-2026-001 SolarTech Rooftop Solar Retrofit` |
| Requisition | `REQ-2026-001 Solar components for buyer PO BC-2026-089` |
| Requisition amount | MYR 178,500 |
| RFQ | `RFQ-2026-001 Solar component supplier sourcing` |
| Supplier quotation 1 | `QTN-2026-001 Mega Components, MYR 118,000` |
| Supplier quotation 2 | `QTN-2026-002 TechParts Asia, MYR 62,000` |
| Purchase order 1 | `PO-2026-0001 Solar panels batch 1, MYR 118,000` |
| Purchase order 2 | `PO-2026-0002 Inverter units, MYR 62,000` |
| Receipt 1 | `RCPT-2026-0001 Solar panels received` |
| Invoice 1 | `INV-2026-0001 Mega Components, MYR 118,000` |

### Required Audit Events

- `PROJECT_CREATED`
- `REQUISITION_CREATED`
- `REQUISITION_SUBMITTED`
- `REQUISITION_APPROVED`
- `RFQ_CREATED`
- `QUOTATION_RECEIVED`
- `PURCHASE_ORDER_CREATED`
- `PURCHASE_ORDER_ISSUED`
- `RECEIPT_RECORDED`
- `INVOICE_RECORDED`

## Use Case 3 - Revenue-Generating Opportunity

### Goal

Show that MEPN only creates mudarabah finance opportunities from
revenue-generating procurement evidence.

### Flow

1. User selects the approved procurement project.
2. User links buyer purchase order or contract award.
3. System validates source document type.
4. User enters expected revenue, expected cost, and requested capital.
5. System blocks routine internal consumption cases.
6. Valid opportunity becomes ready for application.

### Mock Opportunity Data

| Field | Suggested Value |
|---|---|
| Opportunity ID | `OPP-2026-001` |
| Title | SolarTech rooftop solar supply opportunity |
| Source type | `buyer_purchase_order` |
| Source document | `BC-2026-089 SolarTech buyer PO` |
| Buyer | SolarTech Industries Sdn Bhd |
| Expected revenue | MYR 280,000 |
| Expected cost | MYR 210,000 |
| Requested capital | MYR 180,000 |
| Currency | MYR |
| Status | `ready_for_application` |
| Eligibility | Revenue-generating |

### Negative Test Data

| Case | Expected Result |
|---|---|
| Office laptop purchase for internal admin use | Blocked as non-revenue-generating |
| Routine pantry supplies | Blocked as internal consumption |
| Unlinked free-text capital request | Blocked due to missing source evidence |

## Use Case 4 - Mudarabah Application Review

### Goal

Show financier and Shariah review gates without implying automatic approval.

### Flow

1. Procurement officer creates a mudarabah application from `OPP-2026-001`.
2. System generates evidence checklist.
3. User links buyer PO, supplier quotations, project budget, and delivery plan.
4. Financier records due diligence.
5. Shariah reviewer records Shariah decision.
6. Application can only be approved when both reviews pass.
7. Contract generation is blocked before approval.

### Mock Application Data

| Field | Suggested Value |
|---|---|
| Application ID | `APP-2026-001` |
| Applicant | Ahmad Razali |
| Requested capital | MYR 180,000 |
| Purpose | Restricted working capital for SolarTech buyer PO fulfillment |
| Restricted use | Pay approved suppliers for solar panels, inverter units, and mounting hardware only |
| Capital provider ratio | 60% |
| Mudarib ratio | 40% |
| Due diligence status | `APPROVED_WITH_CONDITIONS` |
| Shariah review status | `APPROVED` |
| Application status | `APPROVED` after both reviews |

### Evidence Checklist

| Code | Label | Status |
|---|---|---|
| `BUYER_PO` | Buyer purchase order or contract award | Verified |
| `SUPPLIER_QUOTATION` | Approved supplier quotations | Verified |
| `COST_BUDGET` | Itemized procurement cost budget | Verified |
| `DELIVERY_PLAN` | Delivery and project milestone plan | Submitted |
| `SHARIAH_ELIGIBILITY` | Goods/services Shariah eligibility check | Verified |
| `BUYER_CREDIT` | Buyer credit/payment risk assessment | Submitted |
| `DISBURSEMENT_CONTROL` | Direct supplier payment or controlled account setup | Waived for direct supplier payment |

## Use Case 5 - Evidence, Audit, And Hash Verification

### Goal

Show evidence confidence without claiming real Fabric anchoring unless it exists.

### Flow

1. User uploads or registers procurement documents.
2. Document versions are immutable.
3. System creates canonical hash records.
4. Evidence pack is generated for the project/application.
5. Audit timeline shows major events.
6. Fabric status shows pending, submitted, verified, failed, or unavailable.

### Mock Evidence Data

| Document | Suggested File Name | Status |
|---|---|---|
| Buyer PO | `BC-2026-089-solartech-buyer-po.pdf` | Versioned and hashed |
| Supplier quotation | `QTN-2026-001-mega-components.pdf` | Versioned and hashed |
| Purchase order | `PO-2026-0001-solar-panels.pdf` | Versioned and hashed |
| Receipt | `RCPT-2026-0001-solar-panels.pdf` | Versioned and hashed |
| Invoice | `INV-2026-0001-mega-components.pdf` | Versioned and hashed |
| Mudarabah contract | `CTR-2026-001-restricted-mudarabah.pdf` | Generated/prototype |

Use hash placeholders in demo data:

```text
sha256:demo-buyer-po-bc-2026-089
sha256:demo-quotation-qtn-2026-001
sha256:demo-purchase-order-po-2026-0001
sha256:demo-invoice-inv-2026-0001
```

These are human-readable placeholders for demo fixtures. Production-like tests
should use real SHA-256 values generated from canonical JSON or uploaded file
bytes.

## Use Case 6 - Ledger, Profit/Loss, And Closure

### Goal

Show that mudarabah profit is distributed from actual outcome and that losses
are not converted into guaranteed financier returns.

### Flow

1. Capital is recorded as restricted project capital.
2. Supplier payments and allowed expenses are recorded.
3. Buyer payment is recorded as revenue.
4. System calculates preliminary profit/loss.
5. Profit is distributed by approved ratio.
6. Genuine loss routes to loss review, not guaranteed repayment.
7. Closure pack links back to procurement evidence and audit.

### Mock Ledger Data

| Entry Type | Description | Amount |
|---|---|---:|
| `capital_disbursement` | Capital provided by Amanah Islamic Bank | MYR 180,000 |
| `supplier_payment` | Mega Components solar panels | MYR -118,000 |
| `supplier_payment` | TechParts Asia inverter units | MYR -62,000 |
| `allowed_expense` | Delivery and site logistics | MYR -10,000 |
| `buyer_receipt` | SolarTech milestone payment | MYR 280,000 |

### Profit/Loss Calculation

| Field | Value |
|---|---:|
| Total revenue | MYR 280,000 |
| Total allowed cost | MYR 210,000 |
| Net profit | MYR 70,000 |
| Rabb-ul-mal share, 60% | MYR 42,000 |
| Mudarib share, 40% | MYR 28,000 |

Important rule:

```text
Do not seed a fixed monthly return, fixed interest-like return, or guaranteed
capital-provider profit.
```

## Use Case 7 - Integration Outbox And Operations

### Goal

Show that external integrations are controlled, retryable, and visible.

### Flow

1. Evidence pack export creates an outbox event.
2. Mock Fabric anchor request creates an outbox event.
3. Mock e-signature package request creates an outbox event.
4. Worker processes events.
5. UI shows pending, retrying, completed, failed, or unavailable states.

### Mock Integration Events

| Event | Aggregate | Status | Notes |
|---|---|---|---|
| `EVIDENCE_PACK_EXPORT_REQUESTED` | `EvidencePack EVP-2026-001` | Completed | Export file available |
| `FABRIC_ANCHOR_REQUESTED` | `HashRecord HASH-2026-001` | Pending | Do not claim verified |
| `ESIGNATURE_PACKAGE_REQUESTED` | `Contract CTR-2026-001` | Retrying | Provider timeout |
| `ERP_SYNC_REQUESTED` | `PurchaseOrder PO-2026-0001` | Completed | Mock ERP reference stored |
| `WEBHOOK_DELIVERY_REQUESTED` | `Application APP-2026-001` | Failed | Demo receiver unavailable |

## Suggested Seed Order

Seed data should be created in this order:

1. Organizations
2. Users
3. Roles and memberships
4. Workspace
5. Project
6. Suppliers
7. Requisition and items
8. Approval
9. RFQ and quotation
10. Purchase orders
11. Receipts and invoices
12. Documents and document versions
13. Evidence items and evidence pack
14. Hash records
15. Procurement opportunity
16. Mudarabah application
17. Evidence checklist
18. Due diligence and Shariah review
19. Contract, disbursement, ledger, profit/loss, and closure pack
20. Audit events and outbox events
21. Graph read-model data if needed

## UI Documentation Use

This mock data should support:

- role-aware dashboard screenshots
- procurement hub with exception and matched states
- finance application workspace with realistic evidence/review data
- ledger and P/L screens with domain-safe profit sharing
- audit and Fabric status screens with honest anchor states
- network canvas with buyer, supplier, SME, financier, opportunity, and contract
  relationships
- integrations screen with retry/idempotency examples
