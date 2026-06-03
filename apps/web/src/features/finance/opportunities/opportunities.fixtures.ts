import type { OpportunityRawDto } from './opportunities.types'

export const opportunityFixtures: OpportunityRawDto[] = [
  {
    id: 'opp-fixture-ready',
    title: 'School catering inventory order',
    description:
      'Source: buyer_purchase_order\nSource document: PO-BUYER-2026-001\nBuyer: Example School Sdn Bhd\nExpected revenue: 18000\nExpected cost: 12000\nEligibility: revenue-generating opportunity',
    status: 'OPEN',
    estimatedCapital: 12000,
    expectedProfit: 6000,
    currency: 'MYR',
    project: {
      name: 'Catering stock purchase',
    },
    applications: [],
  },
  {
    id: 'opp-fixture-ineligible',
    title: 'Office laptop refresh',
    description:
      'Source: equivalent_revenue_document\nSource document: INTERNAL-REQ-001\nBuyer: Internal department\nExpected revenue: 0\nExpected cost: 9000\nEligibility: internal consumption',
    status: 'INELIGIBLE',
    estimatedCapital: 9000,
    expectedProfit: 0,
    currency: 'MYR',
    project: {
      name: 'Internal IT refresh',
    },
    applications: [],
  },
]
