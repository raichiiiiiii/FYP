import type { ReportType } from './report-export-lifecycle';

type CsvRow = {
  section: string;
  metric: string;
  value: string | number | boolean | null | undefined;
};

const csvHeaders = ['section', 'metric', 'value'] as const;

export function serializeReportDtoToCsv(
  reportType: ReportType,
  report: unknown,
) {
  const rows: CsvRow[] = [
    {
      section: 'report',
      metric: 'type',
      value: reportType,
    },
  ];

  if (!isRecord(report)) {
    return serializeRows(rows);
  }

  addScalarRow(rows, 'report', 'organizationId', report.organizationId);
  addScalarRow(rows, 'report', 'generatedAt', report.generatedAt);

  if (Array.isArray(report.sections)) {
    for (const section of report.sections) {
      if (!isRecord(section)) {
        continue;
      }

      const sectionId = isCsvScalar(section.id)
        ? String(section.id)
        : 'section';

      addScalarRow(rows, `section:${sectionId}`, 'label', section.label);
      addScalarRow(rows, `section:${sectionId}`, 'total', section.total);
      addScalarRow(rows, `section:${sectionId}`, 'status', section.status);
    }
  }

  addObjectRows(rows, 'totals', report.totals);
  addObjectRows(rows, 'counts', report.counts);

  for (const key of Object.keys(report).sort()) {
    if (
      key === 'sections' ||
      key === 'totals' ||
      key === 'counts' ||
      key === 'organizationId' ||
      key === 'generatedAt'
    ) {
      continue;
    }

    if (isRecord(report[key])) {
      addObjectRows(rows, key, report[key]);
    }
  }

  return serializeRows(rows);
}

export function escapeCsvField(
  value: string | number | boolean | null | undefined,
) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function serializeRows(rows: CsvRow[]) {
  return [
    csvHeaders.join(','),
    ...rows.map((row) =>
      csvHeaders.map((header) => escapeCsvField(row[header])).join(','),
    ),
  ].join('\n');
}

function addObjectRows(rows: CsvRow[], section: string, value: unknown) {
  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(value).sort()) {
    addScalarRow(rows, section, key, value[key]);
  }
}

function addScalarRow(
  rows: CsvRow[],
  section: string,
  metric: string,
  value: unknown,
) {
  if (!isCsvScalar(value)) {
    return;
  }

  rows.push({
    section,
    metric,
    value,
  });
}

function isCsvScalar(
  value: unknown,
): value is string | number | boolean | null | undefined {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
