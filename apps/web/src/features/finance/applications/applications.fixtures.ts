import type { ApplicationRawDto } from './applications.types'

export const applicationFixtures: ApplicationRawDto[] = [
  {
    id: 'app-demo-001',
    status: 'DUE_DILIGENCE_IN_REVIEW',
    requestedCapital: 12000,
    currency: 'MYR',
    opportunity: {
      title: 'School catering inventory financing',
      project: {
        name: 'Catering stock purchase',
      },
    },
    applicantUser: {
      displayName: 'Procurement Officer',
    },
    evidenceChecklist: {
      items: [{ status: 'COMPLETED' }, { status: 'PENDING' }],
    },
    dueDiligenceReports: [
      {
        status: 'IN_REVIEW',
        riskRating: 'medium',
        reviewerUser: {
          displayName: 'Financier reviewer',
        },
      },
    ],
    dueAt: '2026-06-12T00:00:00.000Z',
  },
  {
    id: 'app-demo-002',
    status: 'SHARIAH_IN_REVIEW',
    requestedCapital: 30000,
    currency: 'MYR',
    opportunity: {
      title: 'Medical supplies purchase order',
    },
    applicantUser: {
      displayName: 'SME Admin',
    },
    evidenceChecklist: {
      items: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }],
    },
    shariahReviews: [
      {
        status: 'IN_REVIEW',
        reviewerUser: {
          displayName: 'Shariah reviewer',
        },
      },
    ],
    dueAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'app-demo-003',
    status: 'PROFIT_LOSS_CALCULATED',
    requestedCapital: 18000,
    currency: 'MYR',
    opportunity: {
      title: 'Retail distribution order',
    },
    applicantUser: {
      displayName: 'Finance user',
    },
    riskRating: 'low',
    evidenceGapCount: 0,
    dueAt: '2026-06-20T00:00:00.000Z',
  },
]
