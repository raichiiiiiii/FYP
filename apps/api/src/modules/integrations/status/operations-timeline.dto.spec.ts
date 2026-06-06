import {
  operationsTimelineCategories,
  operationsTimelineSeverities,
  sanitizeOperationsTimelineMetadata,
  sanitizeOperationsTimelineText,
  type OperationsTimelineItemDto,
} from './operations-timeline.dto';

describe('OperationsTimelineItemDto contract', () => {
  const passwordLike = `${'password'}=example`;
  const tokenLike = `${'token'}=not-allowed`;

  it('defines reviewer timeline categories and severities', () => {
    expect(operationsTimelineCategories).toEqual([
      'health',
      'worker',
      'outbox',
      'reconciliation',
      'fabric',
      'report',
      'backup',
      'deployment',
    ]);
    expect(operationsTimelineSeverities).toEqual([
      'info',
      'success',
      'warning',
      'error',
    ]);
  });

  it('supports safe reviewer-facing timeline fields', () => {
    const item: OperationsTimelineItemDto = {
      id: 'timeline-1',
      timestamp: '2026-06-06T00:00:00.000Z',
      category: 'outbox',
      severity: 'warning',
      title: 'Outbox retry scheduled',
      summary: 'Fabric anchor request is retrying after a transient failure.',
      entityType: 'OutboxEvent',
      entityId: 'outbox-1',
      sourcePath: '/integrations/outbox/outbox-1',
      evidencePath: 'docs/evidence/qa/REPORT_EXPORT_EVIDENCE.md',
      status: 'RETRYING',
      metadataSummary: {
        attempts: 2,
        retryable: true,
      },
    };

    expect(item.category).toBe('outbox');
    expect(item.metadataSummary?.attempts).toBe(2);
  });

  it('redacts dangerous text from summaries and metadata', () => {
    expect(sanitizeOperationsTimelineText('worker healthy')).toBe(
      'worker healthy',
    );
    expect(sanitizeOperationsTimelineText('-----BEGIN PRIVATE KEY-----')).toBe(
      '[redacted]',
    );
    expect(sanitizeOperationsTimelineText(passwordLike)).toBe('[redacted]');

    const metadata = sanitizeOperationsTimelineMetadata({
      attempts: 2,
      status: 'PENDING',
      privateKey: 'not allowed',
      gateway: 'configured',
      raw: { payload: true },
      note: tokenLike,
    });

    expect(metadata).toEqual({
      attempts: 2,
      gateway: 'configured',
      note: '[redacted]',
      status: 'PENDING',
    });
  });
});
