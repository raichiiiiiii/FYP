import {
  buildReviewReadiness,
  canReadFinanceSummary,
  canReadProcurementSummary,
  summarySeverityForCount,
} from './summary-contract';

describe('summary contract helpers', () => {
  it('enforces procurement summary role visibility', () => {
    expect(canReadProcurementSummary(['PROCUREMENT_OFFICER'])).toBe(true);
    expect(canReadProcurementSummary(['AUDITOR'])).toBe(true);
    expect(canReadProcurementSummary(['FINANCIER_USER'])).toBe(false);
  });

  it('enforces finance summary role visibility', () => {
    expect(canReadFinanceSummary(['FINANCIER_USER'])).toBe(true);
    expect(canReadFinanceSummary(['SHARIAH_REVIEWER'])).toBe(true);
    expect(canReadFinanceSummary(['PROCUREMENT_OFFICER'])).toBe(false);
  });

  it('maps counts to stable severities', () => {
    expect(summarySeverityForCount(0, { warning: 1, danger: 3 })).toBe(
      'success',
    );
    expect(summarySeverityForCount(1, { warning: 2, danger: 4 })).toBe(
      'neutral',
    );
    expect(summarySeverityForCount(2, { warning: 2, danger: 4 })).toBe(
      'warning',
    );
    expect(summarySeverityForCount(4, { warning: 2, danger: 4 })).toBe(
      'danger',
    );
  });

  it('builds bounded review readiness states', () => {
    expect(
      buildReviewReadiness({
        id: 'evidence',
        area: 'finance',
        label: 'Evidence',
        ready: 3,
        total: 3,
        targetRoute: '/finance/applications',
      }),
    ).toMatchObject({ ready: 3, total: 3, missing: 0, status: 'ready' });

    expect(
      buildReviewReadiness({
        id: 'approvals',
        area: 'procurement',
        label: 'Approvals',
        ready: 1,
        total: 3,
        targetRoute: '/procurement/approvals',
      }),
    ).toMatchObject({ ready: 1, total: 3, missing: 2, status: 'partial' });

    expect(
      buildReviewReadiness({
        id: 'empty',
        area: 'dashboard',
        label: 'Empty',
        ready: 5,
        total: 0,
        targetRoute: '/dashboard',
      }),
    ).toMatchObject({ ready: 0, total: 0, missing: 0, status: 'empty' });
  });
});
