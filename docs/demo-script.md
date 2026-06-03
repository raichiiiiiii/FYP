# MEPN Demo Script

## Demo Objective

Show how MEPN supports procurement automation and restricted mudarabah financing
workflows using procurement evidence, review gates, audit visibility, and
deployment-ready infrastructure.

## Demo Roles

- SME Admin
- Procurement Officer
- Financial Entity Reviewer
- Shariah/Compliance Reviewer
- Auditor

## Demo Setup

Before the demo:

1. Start local infrastructure or the Azure VM deployment.
2. Confirm the app loads.
3. Confirm API health returns `status: ok`.
4. Use the local/dev login flow or prepared demo session.
5. Use seeded/demo data where backend workflows are not yet fully populated.

Useful URLs:

```text
Dashboard:              /dashboard
Organization setup:     /org/setup
Procurement:            /procurement/requisitions
Finance opportunities:  /finance/opportunities
Applications:           /finance/applications
Ledger:                 /finance/ledgers
Audit:                  /audit
Network canvas:         /graph
Integrations:           /integrations
Operations:             /operations
```

## Demo Path

### 1. Dashboard

Show:

- role-aware dashboard
- smart task inbox
- pending evidence or review work
- audit/outbox/Fabric status indicator

Status:

- Working as a role-aware frontend surface.
- Uses typed dashboard data/fixtures where live backend aggregation is not yet
  complete.

Talking point:

MEPN starts from a role-specific operational cockpit instead of a generic home
page.

### 2. Procurement

Show:

- requisition list
- requisition creation or view flow
- approval status
- procurement evidence foundation

Status:

- Requisition and approval foundation exists.
- Advanced RFQ, quotation comparison, receipt, invoice, and matching workflows
  are not all production-complete.

Talking point:

Mudarabah finance should be grounded in procurement evidence, not free-text
financing requests.

### 3. Opportunity

Show:

- revenue-generating opportunity
- source document type
- expected revenue
- expected cost
- requested capital
- eligibility validation

Status:

- Opportunity validation blocks non-revenue-generating/internal consumption
  cases in the frontend foundation.
- Backend persistence may still depend on the current available API contracts.

Talking point:

The system should only turn revenue-linked procurement opportunities into
mudarabah financing candidates.

### 4. Mudarabah Application

Show:

- application status
- evidence checklist
- due diligence workspace
- Shariah review workspace
- reviewer decision states

Status:

- Workspace shell, overview, lifecycle, and role-specific read/action surfaces
  exist.
- Mutation-heavy reviewer decisions and external integrations remain controlled
  and incomplete unless backed by implemented API endpoints.

Talking point:

Financier and Shariah review are separate gates. The UI should not imply a
contract, disbursement, or approval exists before the required review state
exists.

### 5. Ledger And Profit/Loss

Show:

- project ledger
- revenue evidence
- cost evidence
- preliminary profit/loss
- profit-sharing ratio
- no guaranteed fixed return
- loss exception state

Status:

- Ledger and calculation display are implemented as a domain-safe frontend
  foundation.
- Real payment/disbursement mutations are not claimed unless the backend
  contract exists.

Talking point:

Mudarabah profit distribution is based on actual profit and agreed ratio. The
system must not calculate guaranteed fixed returns.

### 6. Audit And Fabric Verification

Show:

- audit timeline
- document hash
- Fabric anchor status
- pending, submitted, verified, failed, and unavailable distinctions

Status:

- The UI distinguishes anchor states honestly.
- Real Fabric Gateway anchoring is not complete; mock/pending/unavailable states
  must be labelled as such.

Talking point:

MEPN should never imply evidence is anchored or verified unless the proof exists.

### 7. Network Canvas

Show:

- buyer
- supplier
- financier
- opportunity
- application
- evidence relationships

Status:

- Graph/canvas foundation exists with permission-filtered fixture/read-model
  data.
- Drag/drop persistence and advanced risk overlays are future work.

Talking point:

The graph is a visualization layer over real records, not the source of truth.

### 8. Integrations And Operations

Show:

- ERP integration status
- Fabric adapter status
- webhook/outbox state
- deployment health
- degraded/unavailable states

Status:

- Operational visibility is implemented with clear status states.
- External integrations remain adapter/mock based unless configured later.

Talking point:

External systems are unreliable by default, so integration work goes through
adapters and outbox status instead of being hidden inside core workflows.

## Known Limitations

- Backend APIs may still be incomplete for some advanced screen actions.
- Some frontend views use typed fixtures or local/demo state.
- Fabric anchoring may be mocked, pending, unavailable, or externally integrated
  depending on environment.
- Payment, disbursement, ERP, e-signature, and finance provider integrations are
  not production-ready.
- Shariah/legal review remains human-governed; the app records and enforces
  workflow gates but does not replace expert review.
- Azure Student VM deployment is single-node and not production-grade.
- Real financial customer data must not be used without security, privacy,
  legal, Shariah, and regulatory approval.

## Close The Demo

End by showing:

- source-of-truth documents in `docs/`
- test report in `docs/testing/test-report-template.md`
- deployment guide in `docs/deployment/azure-student-vm-deployment.md`
- current limitations
- next implementation slice or UAT plan
