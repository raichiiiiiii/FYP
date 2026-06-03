import { describe, expect, it } from 'vitest'

import {
  buildWorkspaceRoleGuidance,
  displayFinanceState,
  formatRatio,
  summarizeChecklist,
  summarizeWorkspaceLedger,
} from './financeWorkspaceDisplay.model'

describe('finance workspace display helpers', () => {
  it('summarizes evidence readiness without treating pending items as ready', () => {
    const summary = summarizeChecklist({
      items: [
        {
          status: 'COMPLETED',
        },
        {
          status: 'PENDING',
        },
        {
          status: 'WAIVED',
        },
      ],
    })

    expect(summary.readyCount).toBe(2)
    expect(summary.missing).toBe(1)
    expect(summary.progress).toBe(67)
  })

  it('summarizes ledger totals without calculating guaranteed fixed return', () => {
    const summary = summarizeWorkspaceLedger({
      ledgerEntries: [
        {
          entryType: 'REVENUE',
          amount: 14000,
        },
        {
          entryType: 'COST',
          amount: 9000,
        },
      ],
    })

    expect(summary.revenue).toBe(14000)
    expect(summary.costs).toBe(9000)
    expect(summary.net).toBe(5000)
    expect(formatRatio(0.6)).toBe('60%')
  })

  it('returns role guidance for review gates and read-only audit access', () => {
    expect(displayFinanceState('SHARIAH_IN_REVIEW')).toBe('SHARIAH IN REVIEW')

    const shariahGuidance = buildWorkspaceRoleGuidance(
      {
        canSubmitEvidence: false,
        canReviewFinance: false,
        canReviewShariah: true,
        canCreateContract: false,
        isAuditor: false,
      },
      'SHARIAH_IN_REVIEW',
      {
        completed: 2,
        missing: 0,
        progress: 100,
        readyCount: 2,
        rejected: 0,
        total: 2,
        waived: 0,
      },
    )

    expect(shariahGuidance.title).toBe('Shariah/compliance gate')
    expect(shariahGuidance.message).toContain('guaranteed-return prohibition')

    const auditGuidance = buildWorkspaceRoleGuidance(
      {
        canSubmitEvidence: false,
        canReviewFinance: false,
        canReviewShariah: false,
        canCreateContract: false,
        isAuditor: true,
      },
      'CLOSED',
      {
        completed: 2,
        missing: 0,
        progress: 100,
        readyCount: 2,
        rejected: 0,
        total: 2,
        waived: 0,
      },
    )

    expect(auditGuidance.title).toBe('Auditor workspace is read-only')
  })
})
