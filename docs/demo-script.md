# MEPN Demo Script

## Demo Objective

Show how MEPN supports procurement automation and restricted mudarabah financing
workflows using procurement evidence, review gates, audit visibility, and
deployment-ready infrastructure.

## Current Review Status

The UI/UX close-alignment round is documented in:

```text
docs/ui/ui-ux-close-alignment-final-report.md
```

The latest local closeout verification passed lint, typecheck, unit/component
tests, production build, Playwright E2E, Docker Compose config, and Docker
Compose build. Use `docs/testing/test-report-template.md` for the detailed
verification record.

## Demo Roles

- SME Admin
- Procurement Officer
- Approver
- Finance/Accounting User
- Financial Entity Reviewer
- Shariah/Compliance Reviewer
- Auditor

## Demo Setup

Before the demo:

1. Start local infrastructure or the Azure VM deployment.
2. Confirm the app loads.
3. Confirm API health returns `status: ok`.
4. Run the UAT seed command against the active API.
5. Save the seed JSON output as demo evidence.
6. Use the local/dev login flow with the seeded `email` and `organization.id`.

Seed command:

```bash
pnpm seed:uat
```

Optional API override:

```bash
UAT_API_BASE_URL=http://localhost:3000/api/v1 pnpm seed:uat
```

The seed creates a fictional TechBuild Energy / SolarTech rooftop solar scenario
through API endpoints. It prints the organization ID, admin user, role users,
procurement records, evidence pack, finance application, closure pack, and
reviewer start URLs.

Useful URLs:

```text
Dashboard:              /dashboard
Organization setup:     /org/setup
Procurement:            /procurement/requisitions
Finance opportunities:  /finance/opportunities
Applications:           /finance/applications
Ledger:                 /finance/ledgers
Audit search:            /audit/search
Network canvas:         /graph/projects
Integrations:           /integrations
Operations:             /operations
Reports:                /reports
```

Guided reviewer aid:

- After sign-in, open **Demo guide** from the floating in-app control.
- Use it as a route checklist for the reviewer path.
- Treat its checkboxes as local reviewer progress only; they do not mutate
  procurement, finance, Fabric, audit, or ledger state.
- The Fabric proof step is environment-gated and must be assessed from the
  committed Fabric UAT evidence or a live Gateway run.

Data-source rule:

- API-backed demo data comes from `pnpm seed:uat`.
- Some dashboard, graph, and audit verification edge states still use typed
  frontend fixtures for local examples and tests.
- Do not describe fixture rows, mock adapters, disabled exports, or unavailable
  worker health as production-ready behavior.

## Demo Path

### 1. Dashboard

Show:

- role-aware dashboard
- smart task inbox
- pending evidence or review work
- audit/outbox/Fabric status indicator

Status:

- Working as a role-aware frontend surface.
- Uses typed dashboard data where live backend aggregation is not yet complete.
- Treat dashboard KPI values as demo/reviewer signals until backend summary DTOs
  are added.

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

- The UAT seed creates an API-backed project, supplier, requisition, approval,
  RFQ, quotation, purchase order, receipt, and invoice.
- Full supplier portal and advanced matching resolution remain future work.

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

- The UAT seed creates a revenue-generating opportunity linked to the seeded
  procurement project and purchase order.
- The frontend still blocks non-revenue-generating/internal consumption cases.

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

- The UAT seed creates an application, evidence checklist, due diligence review,
  Shariah review, approval, contract, disbursement, ledger entry, profit/loss
  statement, and closure pack through existing API endpoints.
- External integration effects remain mock/adapter-backed unless configured
  separately.

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
- reviewer classification and closure gate

Status:

- The UAT seed records a preliminary revenue/cost outcome for the TechBuild
  scenario.
- The loss exception UAT path creates a negative profit/loss case through API
  setup, then shows reviewer evidence review, classification rationale, and
  closure-gate clearance from the application workspace.
- The demo must state that this is seeded UAT data and not a real payment or
  production disbursement.

Talking point:

Mudarabah profit distribution is based on actual profit and agreed ratio. The
system must not calculate guaranteed fixed returns. Genuine commercial loss is
handled as a reviewer-classified exception, while breach, negligence,
misconduct, fraud, and insufficient evidence remain distinct classifications.

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
- Audit verification edge states may use fixtures to show pending, submitted,
  verified, failed, and unavailable UI behavior.

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

- Graph/canvas foundation exists with permission-filtered graph/read-model data.
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
- Worker health is not yet backed by a dedicated heartbeat endpoint.

Talking point:

External systems are unreliable by default, so integration work goes through
adapters and outbox status instead of being hidden inside core workflows.

## Known Limitations

- Backend APIs may still be incomplete for some advanced screen actions.
- Some frontend views use typed fixtures or local/demo state.
- Reports use current API list data and intentionally disabled export actions
  until dedicated report export endpoints exist.
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
