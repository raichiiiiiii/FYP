import {
  escapeCsvField,
  serializeReportDtoToCsv,
} from '../../../src/modules/reports/report-csv.serializer';

describe('report CSV serializer', () => {
  it('escapes commas, quotes, and newlines', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('quoted "value"')).toBe('"quoted ""value"""');
    expect(escapeCsvField('line\nbreak')).toBe('"line\nbreak"');
    expect(escapeCsvField(null)).toBe('');
  });

  it('serializes report DTOs with deterministic headers and sorted metrics', () => {
    const csv = serializeReportDtoToCsv('procurement', {
      organizationId: 'org-1',
      generatedAt: '2026-06-06T00:00:00.000Z',
      counts: {
        suppliers: 1,
        projects: 2,
      },
      requisitionsByStatus: {
        SUBMITTED: 1,
        APPROVED: 2,
      },
    });

    expect(csv.split('\n')[0]).toBe('section,metric,value');
    expect(csv).toContain('report,type,procurement');
    expect(csv).toContain('counts,projects,2');
    expect(csv).toContain('counts,suppliers,1');
    expect(csv.indexOf('counts,projects,2')).toBeLessThan(
      csv.indexOf('counts,suppliers,1'),
    );
    expect(csv).toContain('requisitionsByStatus,APPROVED,2');
    expect(csv).toContain('requisitionsByStatus,SUBMITTED,1');
  });

  it('serializes summary sections without raw nested payloads', () => {
    const csv = serializeReportDtoToCsv('summary', {
      organizationId: 'org-1',
      generatedAt: '2026-06-06T00:00:00.000Z',
      sections: [
        {
          id: 'finance',
          label: 'Finance',
          total: 0,
          status: 'restricted',
          nested: {
            hidden: true,
          },
        },
      ],
      totals: {
        finance: 0,
        procurement: 4,
      },
    });

    expect(csv).toContain('section:finance,label,Finance');
    expect(csv).toContain('section:finance,status,restricted');
    expect(csv).toContain('totals,finance,0');
    expect(csv).not.toContain('hidden');
  });
});
