import type { ApplicationRawDto } from './applications.types'

export const applicationFixtures: ApplicationRawDto[] = [
  {
    id: 'app-demo-001',
    status: 'DUE_DILIGENCE_IN_REVIEW',
    requestedCapital: 180000,
    currency: 'MYR',
    opportunity: {
      title: 'SolarTech rooftop solar restricted capital',
      project: {
        name: 'SolarTech Rooftop Solar Retrofit',
      },
    },
    applicantUser: {
      displayName: 'Ahmad Razali',
    },
    evidenceChecklist: {
      items: [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'PENDING' },
      ],
    },
    dueDiligenceReports: [
      {
        status: 'IN_REVIEW',
        riskRating: 'medium',
        reviewerUser: {
          displayName: 'Omar Farouq',
        },
      },
    ],
    dueAt: '2026-06-12T00:00:00.000Z',
  },
  {
    id: 'app-demo-002',
    status: 'SHARIAH_IN_REVIEW',
    requestedCapital: 62000,
    currency: 'MYR',
    opportunity: {
      title: 'Solar inverter units purchase order',
    },
    applicantUser: {
      displayName: 'Aisha Rahman',
    },
    evidenceChecklist: {
      items: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }],
    },
    shariahReviews: [
      {
        status: 'IN_REVIEW',
        reviewerUser: {
          displayName: 'Dr. Hassan Malik',
        },
      },
    ],
    dueAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'app-demo-003',
    status: 'PROFIT_LOSS_CALCULATED',
    requestedCapital: 180000,
    currency: 'MYR',
    opportunity: {
      title: 'SolarTech milestone revenue review',
    },
    applicantUser: {
      displayName: 'Omar Farouq',
    },
    riskRating: 'low',
    evidenceGapCount: 0,
    dueAt: '2026-06-20T00:00:00.000Z',
  },
]
