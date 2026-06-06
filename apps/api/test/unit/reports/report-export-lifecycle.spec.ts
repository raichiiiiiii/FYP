import { BadRequestException } from '@nestjs/common';
import {
  assertReportExportTransition,
  normalizeReportExportFormat,
  normalizeReportExportStatus,
  normalizeReportType,
} from '../../../src/modules/reports/report-export-lifecycle';

describe('report export lifecycle helpers', () => {
  it('normalizes supported report types, formats, and statuses', () => {
    expect(normalizeReportType(' Finance ')).toBe('finance');
    expect(normalizeReportExportFormat(' JSON ')).toBe('json');
    expect(normalizeReportExportStatus(' Completed ')).toBe('completed');
  });

  it('rejects unsupported report types, formats, and statuses', () => {
    expect(() => normalizeReportType('payroll')).toThrow(BadRequestException);
    expect(() => normalizeReportExportFormat('pdf')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeReportExportStatus('done')).toThrow(
      BadRequestException,
    );
  });

  it('allows only explicit export status transitions', () => {
    expect(() =>
      assertReportExportTransition('queued', 'processing'),
    ).not.toThrow();
    expect(() =>
      assertReportExportTransition('processing', 'completed'),
    ).not.toThrow();
    expect(() =>
      assertReportExportTransition('completed', 'processing'),
    ).toThrow(BadRequestException);
    expect(() => assertReportExportTransition('failed', 'queued')).toThrow(
      BadRequestException,
    );
  });
});
