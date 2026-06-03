import type { ApplicationWorkspaceRawDto } from './applicationWorkspace.types'

export const applicationWorkspaceFixture: ApplicationWorkspaceRawDto = {
  id: 'app-workspace-demo',
  opportunityId: 'opp-workspace-demo',
  status: 'DUE_DILIGENCE_IN_REVIEW',
  requestedCapital: 180000,
  currency: 'MYR',
  capitalProviderRatio: 0.6,
  entrepreneurRatio: 0.4,
  opportunity: {
    id: 'opp-workspace-demo',
    title: 'Evidence-backed SolarTech rooftop solar buyer purchase order',
    estimatedCapital: 180000,
    expectedProfit: 70000,
    currency: 'MYR',
  },
  applicantUser: {
    displayName: 'TechBuild Energy Sdn Bhd',
  },
  evidenceChecklist: {
    status: 'IN_PROGRESS',
    items: [
      {
        id: 'ev-buyer-demand',
        label: 'SolarTech buyer purchase order',
        requiredCode: 'BUYER_DEMAND',
        status: 'COMPLETED',
        evidenceItem: {
          id: 'evidence-buyer-demand',
        },
      },
      {
        id: 'ev-supplier-quotation',
        label: 'Mega Components supplier quotation',
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
