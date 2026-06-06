import { BadRequestException } from '@nestjs/common';

export const LOSS_EXCEPTION_CLASSIFICATIONS = [
  'GENUINE_COMMERCIAL_LOSS',
  'BREACH',
  'NEGLIGENCE',
  'MISCONDUCT',
  'FRAUD',
  'INSUFFICIENT_EVIDENCE',
] as const;

export type LossExceptionClassification =
  (typeof LOSS_EXCEPTION_CLASSIFICATIONS)[number];

export const LOSS_EXCEPTION_STATUSES = [
  'OPEN',
  'EVIDENCE_REQUESTED',
  'UNDER_REVIEW',
  'CLASSIFIED',
  'REJECTED',
  'RESOLVED',
  'REOPENED',
  'CANCELLED',
] as const;

export type LossExceptionStatus = (typeof LOSS_EXCEPTION_STATUSES)[number];

const allowedTransitions: Record<LossExceptionStatus, LossExceptionStatus[]> = {
  OPEN: ['EVIDENCE_REQUESTED', 'UNDER_REVIEW', 'CANCELLED'],
  EVIDENCE_REQUESTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['CLASSIFIED', 'REJECTED', 'EVIDENCE_REQUESTED'],
  CLASSIFIED: ['RESOLVED', 'REOPENED'],
  REJECTED: ['REOPENED'],
  RESOLVED: ['REOPENED'],
  REOPENED: ['UNDER_REVIEW', 'EVIDENCE_REQUESTED'],
  CANCELLED: [],
};

export function normalizeLossExceptionClassification(
  value?: string,
  fallback: LossExceptionClassification = 'GENUINE_COMMERCIAL_LOSS',
): LossExceptionClassification {
  const normalized = value?.trim().toUpperCase() || fallback;

  if (
    LOSS_EXCEPTION_CLASSIFICATIONS.includes(
      normalized as LossExceptionClassification,
    )
  ) {
    return normalized as LossExceptionClassification;
  }

  throw new BadRequestException({
    code: 'LOSS_EXCEPTION_CLASSIFICATION_INVALID',
    message: `Unsupported loss exception classification: ${normalized}`,
    nextAllowedActions: [...LOSS_EXCEPTION_CLASSIFICATIONS],
  });
}

export function normalizeLossExceptionStatus(
  value?: string,
  fallback: LossExceptionStatus = 'OPEN',
): LossExceptionStatus {
  const normalized = value?.trim().toUpperCase() || fallback;

  if (LOSS_EXCEPTION_STATUSES.includes(normalized as LossExceptionStatus)) {
    return normalized as LossExceptionStatus;
  }

  throw new BadRequestException({
    code: 'LOSS_EXCEPTION_STATUS_INVALID',
    message: `Unsupported loss exception status: ${normalized}`,
    nextAllowedActions: [...LOSS_EXCEPTION_STATUSES],
  });
}

export function getNextLossExceptionStatuses(status: string) {
  return allowedTransitions[normalizeLossExceptionStatus(status)] ?? [];
}

export function assertLossExceptionTransition(
  currentStatus: string,
  nextStatus: string,
) {
  const current = normalizeLossExceptionStatus(currentStatus);
  const next = normalizeLossExceptionStatus(nextStatus);

  if (current === next) {
    return;
  }

  const allowed = allowedTransitions[current];
  if (!allowed.includes(next)) {
    throw new BadRequestException({
      code: 'WORKFLOW_RULE_VIOLATION',
      message: `Loss exception cannot transition from ${current} to ${next}`,
      requiredState: allowed.length
        ? `One of: ${allowed.join(', ')}`
        : 'No further transition is allowed',
      actualState: current,
      nextAllowedActions: allowed,
    });
  }
}

export function isLossExceptionClosureBlocking(status: string) {
  const normalized = normalizeLossExceptionStatus(status);
  return !['RESOLVED', 'REJECTED'].includes(normalized);
}
