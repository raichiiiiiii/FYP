import { describe, expect, it } from 'vitest'

import {
  applicationWorkspaceRoute,
  filterApplications,
  normalizeApplicationStatus,
  sortApplications,
  summarizeApplications,
} from './applications.model'
import type { ApplicationFiltersState, ApplicationRawDto } from './applications.types'

const rawApplications: ApplicationRawDto[] = [
  {
    id: 'app-001',
    status: 'DUE_DILIGENCE_IN_REVIEW',
    requestedCapital: 12000,
    currency: 'MYR',
    opportunity: {
      title: 'Clinic supplies PO',
    },
    applicantUser: {
      displayName: 'Aminah',
    },
    dueAt: '2026-06-08T00:00:00.000Z',
    dueDiligenceReports: [{ riskRating: 'medium' }],
  },
  {
    id: 'app-002',
    status: 'SHARIAH_IN_REVIEW',
    requestedCapital: 30000,
    currency: 'MYR',
    opportunity: {
      title: 'Catering inventory',
    },
    dueAt: '2026-06-05T00:00:00.000Z',
  },
  {
    id: 'app-003',
    status: 'PROFIT_LOSS_CALCULATED',
    requestedCapital: 8000,
    currency: 'MYR',
    opportunity: {
      title: 'Retail restock',
    },
    riskRating: 'low',
  },
]

const defaultFilters: ApplicationFiltersState = {
  search: '',
  status: 'all',
  roleQueue: 'all',
  riskRating: 'all',
}

describe('applications model', () => {
  it('normalizes backend lifecycle statuses into the application pipeline model', () => {
    expect(normalizeApplicationStatus('DUE_DILIGENCE_IN_REVIEW')).toBe(
      'due_diligence',
    )
    expect(normalizeApplicationStatus('SHARIAH_IN_REVIEW')).toBe('shariah_review')
    expect(normalizeApplicationStatus('PROFIT_LOSS_CALCULATED')).toBe(
      'closure_pending',
    )
    expect(normalizeApplicationStatus('unexpected')).toBe('draft')
  })

  it('filters applications by search text and status', () => {
    const summaries = summarizeApplications(rawApplications)
    const filtered = filterApplications(summaries, {
      ...defaultFilters,
      search: 'clinic',
      status: 'due_diligence',
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('app-001')
  })

  it('filters role queues for Shariah reviewers', () => {
    const summaries = summarizeApplications(rawApplications)
    const filtered = filterApplications(summaries, {
      ...defaultFilters,
      roleQueue: 'shariah',
    })

    expect(filtered.map((application) => application.id)).toEqual(['app-002'])
  })

  it('sorts applications by earliest due date', () => {
    const sorted = sortApplications(summarizeApplications(rawApplications), 'dueAt')

    expect(sorted.map((application) => application.id)).toEqual([
      'app-002',
      'app-001',
      'app-003',
    ])
  })

  it('builds encoded workspace routes for application drill-in navigation', () => {
    expect(applicationWorkspaceRoute('app 001')).toBe(
      '/finance/applications/app%20001',
    )
  })
})
