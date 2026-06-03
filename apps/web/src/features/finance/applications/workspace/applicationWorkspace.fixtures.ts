import type { ApplicationWorkspaceRawDto } from './applicationWorkspace.types'

export const applicationWorkspaceFixture: ApplicationWorkspaceRawDto = {
  id: 'app-workspace-demo',
  opportunityId: 'opp-workspace-demo',
  status: 'DUE_DILIGENCE_IN_REVIEW',
  requestedCapital: 12000,
  currency: 'MYR',
  capitalProviderRatio: 0.6,
  entrepreneurRatio: 0.4,
  opportunity: {
    id: 'opp-workspace-demo',
    title: 'Evidence-backed school catering purchase order',
    estimatedCapital: 12000,
    expectedProfit: 1800,
    currency: 'MYR',
  },
  applicantUser: {
    displayName: 'Example SME Sdn Bhd',
  },
  evidenceChecklist: {
    status: 'IN_PROGRESS',
    items: [
      {
        id: 'ev-buyer-demand',
        label: 'Buyer purchase order',
        requiredCode: 'BUYER_DEMAND',
        status: 'COMPLETED',
        evidenceItem: {
          id: 'evidence-buyer-demand',
        },
      },
      {
        id: 'ev-supplier-quotation',
        label: 'Supplier quotation',
        requiredCode: 'SUPPLIER_QUOTATION',
        status: 'PENDING',
      },
    ],
  },
  dueDiligenceReports: [
    {
      status: 'PENDING',
      riskRating: 'MEDIUM',
      createdAt: '2026-06-03T00:00:00.000Z',
    },
  ],
}
