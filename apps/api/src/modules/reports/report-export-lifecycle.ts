import { BadRequestException } from '@nestjs/common';

export const reportTypes = [
  'summary',
  'procurement',
  'finance',
  'audit',
  'integrations',
] as const;

export const reportExportFormats = ['json'] as const;

export const reportExportStatuses = [
  'queued',
  'processing',
  'completed',
  'failed',
  'expired',
] as const;

export type ReportType = (typeof reportTypes)[number];
export type ReportExportFormat = (typeof reportExportFormats)[number];
export type ReportExportStatus = (typeof reportExportStatuses)[number];

const allowedTransitions: Record<ReportExportStatus, ReportExportStatus[]> = {
  queued: ['processing', 'failed', 'expired'],
  processing: ['completed', 'failed', 'expired'],
  completed: ['expired'],
  failed: [],
  expired: [],
};

export function normalizeReportType(value: string | undefined): ReportType {
  const normalized = value?.trim().toLowerCase();

  if (!isReportType(normalized)) {
    throw new BadRequestException('Unsupported report type');
  }

  return normalized;
}

export function normalizeReportExportFormat(
  value: string | undefined,
): ReportExportFormat {
  const normalized = value?.trim().toLowerCase();

  if (!isReportExportFormat(normalized)) {
    throw new BadRequestException('Unsupported report export format');
  }

  return normalized;
}

export function normalizeReportExportStatus(
  value: string | undefined,
): ReportExportStatus {
  const normalized = value?.trim().toLowerCase();

  if (!isReportExportStatus(normalized)) {
    throw new BadRequestException('Unsupported report export status');
  }

  return normalized;
}

export function assertReportExportTransition(
  currentStatus: string,
  nextStatus: ReportExportStatus,
) {
  const current = normalizeReportExportStatus(currentStatus);
  const allowed = allowedTransitions[current];

  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Report export cannot transition from ${current} to ${nextStatus}`,
    );
  }
}

function isReportType(value: string | undefined): value is ReportType {
  return reportTypes.includes(value as ReportType);
}

function isReportExportFormat(
  value: string | undefined,
): value is ReportExportFormat {
  return reportExportFormats.includes(value as ReportExportFormat);
}

function isReportExportStatus(
  value: string | undefined,
): value is ReportExportStatus {
  return reportExportStatuses.includes(value as ReportExportStatus);
}
