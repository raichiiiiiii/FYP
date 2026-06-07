export const businessActivityPlanVersion = '2026-06-07.u1';

export const minimumBusinessActivitiesPerUser = 7;

const commonSafetyMetadata = {
  localUatOnly: true,
  safeForEvidence: true,
  simulatedOnly: true,
  realFabricProof: false,
  realPaymentExecution: false,
};

const roleActivityTemplates = {
  ORG_ADMIN: [
    activity('org-profile-review', 'ORG_PROFILE_REVIEWED', 'organization', '/organization/profile', 'Reviewed organization profile', 'Checked organization identity, deployment mode, logo, banner, and local node ownership.'),
    activity('user-role-review', 'ORG_USERS_REVIEWED', 'identity', '/admin/users', 'Reviewed organization users', 'Confirmed seeded organization users and sidebar access boundaries.'),
    activity('role-template-review', 'ORG_ROLES_REVIEWED', 'identity', '/admin/roles', 'Reviewed role templates', 'Checked role templates and permission scope for local UAT users.'),
    activity('dashboard-health-review', 'ORG_DASHBOARD_REVIEWED', 'dashboard', '/dashboard', 'Reviewed dashboard status', 'Checked role-aware tasks, system status, and node summary.'),
    activity('network-canvas-review', 'ORG_NETWORK_CANVAS_REVIEWED', 'graph', '/graph/projects', 'Reviewed network canvas', 'Checked local federation canvas and simulated channel visibility.'),
    activity('operations-review', 'ORG_OPERATIONS_REVIEWED', 'operations', '/operations', 'Reviewed operations health', 'Checked local runtime, worker, outbox, and reconciliation status.'),
    activity('integrations-review', 'ORG_INTEGRATIONS_REVIEWED', 'integrations', '/integrations', 'Reviewed integrations', 'Checked integration readiness and reconciliation records without exposing secrets.'),
  ],
  PROCUREMENT_OFFICER: [
    activity('supplier-onboarding-review', 'PROCUREMENT_SUPPLIER_REVIEWED', 'procurement', '/procurement/suppliers', 'Reviewed supplier onboarding', 'Checked approved supplier profile and compliance readiness.'),
    activity('project-review', 'PROCUREMENT_PROJECT_REVIEWED', 'procurement', '/procurement/projects', 'Reviewed procurement project', 'Checked project context and sourcing dependency chain.'),
    activity('requisition-review', 'PROCUREMENT_REQUISITION_REVIEWED', 'procurement', '/procurement/requisitions', 'Reviewed requisition', 'Checked requisition workflow, budget, and line items.'),
    activity('rfq-review', 'PROCUREMENT_RFQ_REVIEWED', 'procurement', '/procurement/rfqs', 'Reviewed RFQ', 'Checked published RFQ and supplier invitation state.'),
    activity('quotation-review', 'PROCUREMENT_QUOTATION_REVIEWED', 'procurement', '/procurement/quotations', 'Reviewed quotation', 'Compared supplier quotation and award readiness.'),
    activity('purchase-order-review', 'PROCUREMENT_PO_REVIEWED', 'procurement', '/procurement/purchase-orders', 'Reviewed purchase order', 'Checked issued purchase order and supplier acknowledgement state.'),
    activity('matching-review', 'PROCUREMENT_MATCHING_REVIEWED', 'procurement', '/procurement/matching', 'Reviewed matching queue', 'Checked receipt, invoice, and three-way matching status.'),
  ],
  APPROVER_MANAGER: [
    activity('approval-dashboard-review', 'APPROVER_DASHBOARD_REVIEWED', 'approval', '/dashboard', 'Reviewed approval dashboard', 'Checked pending approval workload and next-action queue.'),
    activity('business-justification-review', 'APPROVER_BUSINESS_JUSTIFICATION_REVIEWED', 'approval', '/procurement/approvals', 'Reviewed business justification', 'Reviewed requisition purpose and supporting evidence.'),
    activity('budget-review', 'APPROVER_BUDGET_REVIEWED', 'approval', '/procurement/approvals', 'Reviewed budget approval', 'Checked amount, budget availability, and approval conditions.'),
    activity('supplier-award-review', 'APPROVER_SUPPLIER_AWARD_REVIEWED', 'approval', '/procurement/quotations', 'Reviewed supplier award', 'Checked quotation comparison and recommended award.'),
    activity('po-approval-review', 'APPROVER_PO_REVIEWED', 'approval', '/procurement/purchase-orders', 'Reviewed PO approval', 'Checked purchase order approval readiness.'),
    activity('exception-review', 'APPROVER_EXCEPTION_REVIEWED', 'approval', '/procurement/matching', 'Reviewed exception queue', 'Checked matching exception handling and escalation path.'),
    activity('evidence-pack-review', 'APPROVER_EVIDENCE_REVIEWED', 'evidence', '/evidence/packs', 'Reviewed approval evidence', 'Checked evidence pack completeness for approval traceability.'),
  ],
  FINANCE_ACCOUNTANT: [
    activity('opportunity-finance-review', 'FINANCE_OPPORTUNITY_REVIEWED', 'finance', '/finance/opportunities', 'Reviewed finance opportunity', 'Checked opportunity economics, requested capital, and revenue basis.'),
    activity('application-finance-review', 'FINANCE_APPLICATION_REVIEWED', 'finance', '/finance/applications', 'Reviewed mudarabah application', 'Checked application status, applicant, and workspace readiness.'),
    activity('contract-finance-review', 'FINANCE_CONTRACT_REVIEWED', 'finance', '/finance/contracts', 'Reviewed contract record', 'Checked contract status, approved terms, and disbursement readiness.'),
    activity('ledger-review', 'FINANCE_LEDGER_REVIEWED', 'finance', '/finance/ledgers', 'Reviewed project ledger', 'Checked capital, revenue, cost, and invoice ledger entries.'),
    activity('profit-loss-review', 'FINANCE_PROFIT_LOSS_REVIEWED', 'finance', '/finance/profit-loss', 'Reviewed profit/loss', 'Checked ratio-based distribution without guaranteed fixed return.'),
    activity('closure-review', 'FINANCE_CLOSURE_REVIEWED', 'finance', '/finance/closures', 'Reviewed closure pack', 'Checked closure readiness and evidence completeness.'),
    activity('report-export-review', 'FINANCE_REPORT_REVIEWED', 'reports', '/reports', 'Reviewed finance report exports', 'Checked JSON/CSV report export status and audit trace.'),
  ],
  RECEIVING_OFFICER: [
    activity('receiving-dashboard-review', 'RECEIVING_DASHBOARD_REVIEWED', 'receiving', '/dashboard', 'Reviewed receiving dashboard', 'Checked receiving tasks and expected goods/service milestones.'),
    activity('receiving-po-review', 'RECEIVING_PO_REVIEWED', 'receiving', '/procurement/purchase-orders', 'Reviewed receiving purchase order', 'Checked PO lines and delivery expectations.'),
    activity('receipt-review', 'RECEIVING_RECEIPT_REVIEWED', 'receiving', '/procurement/receipts', 'Reviewed receipt records', 'Checked accepted receipt/service confirmation evidence.'),
    activity('invoice-receiving-review', 'RECEIVING_INVOICE_REVIEWED', 'receiving', '/procurement/invoices', 'Reviewed invoice receiving link', 'Checked invoice link to PO and receipt.'),
    activity('matching-support-review', 'RECEIVING_MATCHING_REVIEWED', 'receiving', '/procurement/matching', 'Reviewed matching support', 'Checked receiving contribution to three-way match.'),
    activity('evidence-timeline-review', 'RECEIVING_EVIDENCE_TIMELINE_REVIEWED', 'evidence', '/evidence/timeline', 'Reviewed evidence timeline', 'Checked receiving actions in the audit timeline.'),
    activity('receiving-graph-review', 'RECEIVING_GRAPH_REVIEWED', 'graph', '/graph/projects', 'Reviewed project graph', 'Checked receiving node context and procurement dependencies.'),
  ],
  SUPPLIER_SALES: [
    activity('supplier-dashboard-review', 'SUPPLIER_DASHBOARD_REVIEWED', 'supplier', '/dashboard', 'Reviewed supplier dashboard', 'Checked supplier tasks and available opportunity context.'),
    activity('supplier-opportunity-review', 'SUPPLIER_OPPORTUNITY_REVIEWED', 'supplier', '/finance/opportunities', 'Reviewed supplier opportunity', 'Checked revenue-generating opportunity and buyer demand link.'),
    activity('supplier-application-review', 'SUPPLIER_APPLICATION_REVIEWED', 'supplier', '/finance/applications', 'Reviewed supplier application', 'Checked application readiness and submitted evidence.'),
    activity('supplier-evidence-item-review', 'SUPPLIER_EVIDENCE_ITEM_REVIEWED', 'evidence', '/evidence/items', 'Reviewed submitted evidence items', 'Checked delivery, invoice, and execution evidence labels.'),
    activity('supplier-evidence-pack-review', 'SUPPLIER_EVIDENCE_PACK_REVIEWED', 'evidence', '/evidence/packs', 'Reviewed supplier evidence pack', 'Checked pack status for buyer/financier review.'),
    activity('supplier-timeline-review', 'SUPPLIER_TIMELINE_REVIEWED', 'evidence', '/evidence/timeline', 'Reviewed supplier timeline', 'Checked supplier action history and audit events.'),
    activity('supplier-graph-review', 'SUPPLIER_GRAPH_REVIEWED', 'graph', '/graph/projects', 'Reviewed supplier graph context', 'Checked visible buyer, opportunity, and finance relationships.'),
  ],
  MUDARIB_OPERATOR: [
    activity('mudarib-opportunity-review', 'MUDARIB_OPPORTUNITY_REVIEWED', 'mudarabah', '/finance/opportunities', 'Reviewed mudarabah opportunity', 'Checked opportunity revenue, costs, requested capital, and profit ratio proposal.'),
    activity('mudarib-new-opportunity-review', 'MUDARIB_NEW_OPPORTUNITY_REVIEWED', 'mudarabah', '/finance/opportunities/new', 'Reviewed opportunity creation flow', 'Checked required fields for opportunity submission.'),
    activity('mudarib-application-review', 'MUDARIB_APPLICATION_REVIEWED', 'mudarabah', '/finance/applications', 'Reviewed capital application', 'Checked application status and financier workspace access.'),
    activity('mudarib-workspace-review', 'MUDARIB_WORKSPACE_REVIEWED', 'mudarabah', '/finance/applications', 'Reviewed application workspace', 'Checked evidence, reviews, contract, and disbursement panels.'),
    activity('mudarib-evidence-checklist-review', 'MUDARIB_EVIDENCE_CHECKLIST_REVIEWED', 'evidence', '/evidence/items', 'Reviewed evidence checklist', 'Checked buyer demand, quotation, budget, timeline, and Shariah evidence.'),
    activity('mudarib-closure-review', 'MUDARIB_CLOSURE_REVIEWED', 'finance', '/finance/closures', 'Reviewed closure evidence', 'Checked closure state and distribution basis.'),
    activity('mudarib-graph-review', 'MUDARIB_GRAPH_REVIEWED', 'graph', '/graph/projects', 'Reviewed mudarabah graph', 'Checked opportunity, financier, contract, and evidence relationships.'),
  ],
  INVESTMENT_OFFICER: [
    activity('investment-application-queue-review', 'INVESTMENT_APPLICATION_QUEUE_REVIEWED', 'finance', '/finance/applications', 'Reviewed investment queue', 'Checked submitted applications and due diligence readiness.'),
    activity('investment-workspace-review', 'INVESTMENT_WORKSPACE_REVIEWED', 'finance', '/finance/applications', 'Reviewed application workspace', 'Checked applicant, buyer demand, project economics, and evidence.'),
    activity('investment-due-diligence-review', 'INVESTMENT_DUE_DILIGENCE_REVIEWED', 'finance', '/finance/applications', 'Reviewed due diligence', 'Checked due diligence findings, conditions, and risk basis.'),
    activity('investment-contract-review', 'INVESTMENT_CONTRACT_REVIEWED', 'finance', '/finance/contracts', 'Reviewed contract readiness', 'Checked terms, profit ratio, restrictions, and execution state.'),
    activity('investment-ledger-review', 'INVESTMENT_LEDGER_REVIEWED', 'finance', '/finance/ledgers', 'Reviewed project ledger', 'Checked disbursement, revenue, costs, and monitoring entries.'),
    activity('investment-graph-review', 'INVESTMENT_GRAPH_REVIEWED', 'graph', '/graph/projects', 'Reviewed finance graph', 'Checked authorized network risk and anchor context.'),
    activity('investment-report-review', 'INVESTMENT_REPORT_REVIEWED', 'reports', '/reports', 'Reviewed investment report', 'Checked review pack and export readiness.'),
  ],
  RISK_REVIEWER: [
    activity('risk-queue-review', 'RISK_QUEUE_REVIEWED', 'risk', '/finance/applications', 'Reviewed risk queue', 'Checked applications requiring risk review.'),
    activity('risk-condition-review', 'RISK_CONDITION_REVIEWED', 'risk', '/finance/applications', 'Reviewed risk conditions', 'Checked due diligence conditions and control gaps.'),
    activity('risk-exception-review', 'RISK_EXCEPTION_REVIEWED', 'risk', '/finance/profit-loss', 'Reviewed exception indicators', 'Checked loss and variance indicators without changing closure state.'),
    activity('risk-contract-review', 'RISK_CONTRACT_REVIEWED', 'risk', '/finance/contracts', 'Reviewed contract risk', 'Checked restrictions, loss treatment, and breach clauses.'),
    activity('risk-evidence-review', 'RISK_EVIDENCE_REVIEWED', 'evidence', '/evidence/packs', 'Reviewed risk evidence', 'Checked evidence coverage and unresolved gaps.'),
    activity('risk-graph-review', 'RISK_GRAPH_REVIEWED', 'graph', '/graph/projects', 'Reviewed risk graph', 'Checked risk badges and role-filtered node visibility.'),
    activity('risk-report-review', 'RISK_REPORT_REVIEWED', 'reports', '/reports', 'Reviewed risk report', 'Checked report summary and export status.'),
  ],
  DISBURSEMENT_OFFICER: [
    activity('disbursement-contract-review', 'DISBURSEMENT_CONTRACT_REVIEWED', 'disbursement', '/finance/contracts', 'Reviewed contract execution', 'Checked executed contract and disbursement preconditions.'),
    activity('disbursement-workspace-review', 'DISBURSEMENT_WORKSPACE_REVIEWED', 'disbursement', '/finance/applications', 'Reviewed disbursement workspace', 'Checked application disbursement panel and manual instruction status.'),
    activity('disbursement-queue-review', 'DISBURSEMENT_QUEUE_REVIEWED', 'disbursement', '/operations', 'Reviewed disbursement queue', 'Checked queued/manual operational events without executing real payment.'),
    activity('disbursement-ledger-review', 'DISBURSEMENT_LEDGER_REVIEWED', 'finance', '/finance/ledgers', 'Reviewed disbursement ledger', 'Checked disbursement and capital ledger entries.'),
    activity('disbursement-outbox-review', 'DISBURSEMENT_OUTBOX_REVIEWED', 'operations', '/integrations', 'Reviewed disbursement outbox', 'Checked integration outbox and reconciliation status.'),
    activity('disbursement-closure-review', 'DISBURSEMENT_CLOSURE_REVIEWED', 'finance', '/finance/closures', 'Reviewed closure dependency', 'Checked closure pack dependency on capital release status.'),
    activity('disbursement-report-review', 'DISBURSEMENT_REPORT_REVIEWED', 'reports', '/reports', 'Reviewed disbursement report', 'Checked report export and audit trace.'),
  ],
  FINANCIER_AUDIT_VIEWER: [
    activity('financier-evidence-pack-review', 'FINANCIER_AUDIT_EVIDENCE_PACK_REVIEWED', 'evidence', '/evidence/packs', 'Reviewed financier evidence pack', 'Checked read-only evidence pack and closure references.'),
    activity('financier-hash-review', 'FINANCIER_AUDIT_HASH_REVIEWED', 'evidence', '/evidence/hashes', 'Reviewed hash records', 'Checked local hash records and Fabric verification status boundaries.'),
    activity('financier-timeline-review', 'FINANCIER_AUDIT_TIMELINE_REVIEWED', 'audit', '/evidence/timeline', 'Reviewed audit timeline', 'Checked chronological review, contract, and disbursement events.'),
    activity('financier-audit-events-review', 'FINANCIER_AUDIT_EVENTS_REVIEWED', 'audit', '/audit', 'Reviewed audit events', 'Checked read-only audit event stream.'),
    activity('financier-audit-search-review', 'FINANCIER_AUDIT_SEARCH_REVIEWED', 'audit', '/audit/search', 'Reviewed audit search', 'Checked search/filter evidence behavior.'),
    activity('financier-graph-review', 'FINANCIER_AUDIT_GRAPH_REVIEWED', 'graph', '/graph/projects', 'Reviewed graph visibility', 'Checked finance graph visibility without leaking hidden data to other roles.'),
    activity('financier-evidence-package-review', 'FINANCIER_AUDIT_PACKAGE_REVIEWED', 'evidence', '/evidence-package', 'Reviewed evidence package browser', 'Checked reviewer evidence overview and remaining hardening labels.'),
  ],
};

const fallbackRoleActivities = [
  activity('dashboard-review', 'UAT_DASHBOARD_REVIEWED', 'dashboard', '/dashboard', 'Reviewed dashboard', 'Checked role-scoped dashboard and task visibility.'),
  activity('profile-review', 'UAT_PROFILE_REVIEWED', 'account', '/account/profile', 'Reviewed account profile', 'Checked account profile and permission summary.'),
  activity('inbox-review', 'UAT_INBOX_REVIEWED', 'inbox', '/inbox', 'Reviewed inbox', 'Checked local communication and notification activity.'),
  activity('evidence-review', 'UAT_EVIDENCE_REVIEWED', 'evidence', '/evidence/packs', 'Reviewed evidence', 'Checked evidence pack visibility for assigned role.'),
  activity('audit-review', 'UAT_AUDIT_REVIEWED', 'audit', '/audit', 'Reviewed audit activity', 'Checked audit trail available to the role.'),
  activity('reports-review', 'UAT_REPORTS_REVIEWED', 'reports', '/reports', 'Reviewed reports', 'Checked report summary and export state.'),
  activity('graph-review', 'UAT_GRAPH_REVIEWED', 'graph', '/graph/projects', 'Reviewed graph', 'Checked allowed graph visibility.'),
];

export function businessActivitiesForRole(roleCode) {
  return roleActivityTemplates[roleCode] ?? fallbackRoleActivities;
}

export function knownBusinessActivityRoleCodes() {
  return Object.keys(roleActivityTemplates);
}

function activity(id, eventType, featureArea, route, title, description) {
  return {
    id,
    eventType,
    featureArea,
    route,
    title,
    description,
    entityType: 'UATBusinessActivity',
    completionMode: 'simulated-audit-and-inbox',
    metadata: commonSafetyMetadata,
  };
}
