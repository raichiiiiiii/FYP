import type { OpportunityRawDto } from './opportunities.types'

export const opportunityFixtures: OpportunityRawDto[] = [
  {
    id: 'opp-fixture-ready',
    title: 'SolarTech rooftop solar supply opportunity',
    description:
      'Source: buyer_purchase_order\nSource document: BC-2026-089\nBuyer: SolarTech Industries Sdn Bhd\nExpected revenue: 280000\nExpected cost: 210000\nEligibility: revenue-generating opportunity',
    status: 'OPEN',
    estimatedCapital: 180000,
    expectedProfit: 70000,
    currency: 'MYR',
    project: {
      name: 'SolarTech Rooftop Solar Retrofit',
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
