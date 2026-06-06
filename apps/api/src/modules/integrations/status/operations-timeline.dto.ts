export const operationsTimelineCategories = [
  'health',
  'worker',
  'outbox',
  'reconciliation',
  'fabric',
  'report',
  'backup',
  'deployment',
] as const;

export const operationsTimelineSeverities = [
  'info',
  'success',
  'warning',
  'error',
] as const;

export type OperationsTimelineCategory =
  (typeof operationsTimelineCategories)[number];

export type OperationsTimelineSeverity =
  (typeof operationsTimelineSeverities)[number];

export type OperationsTimelineItemDto = {
  id: string;
  timestamp: string;
  category: OperationsTimelineCategory;
  severity: OperationsTimelineSeverity;
  title: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  sourcePath?: string;
  evidencePath?: string;
  status?: string;
  metadataSummary?: Record<string, string | number | boolean | null>;
};

const dangerousTextPatterns = [
  /-----BEGIN [^-]+-----/i,
  /private[_ -]?key/i,
  /\bpassword\b/i,
  /\btoken\b/i,
  /\bauthorization\b/i,
  /\bsecret\b/i,
  /\.env/i,
  /key\.pem/i,
  /cert\.pem/i,
];

export function sanitizeOperationsTimelineText(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    return undefined;
  }

  const text = String(value).trim();

  if (!text) {
    return undefined;
  }

  return dangerousTextPatterns.some((pattern) => pattern.test(text))
    ? '[redacted]'
    : text;
}

export function sanitizeOperationsTimelineMetadata(
  value: unknown,
): OperationsTimelineItemDto['metadataSummary'] {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce<NonNullable<OperationsTimelineItemDto['metadataSummary']>>(
      (metadata, [key, rawValue]) => {
        const sanitizedKey = sanitizeOperationsTimelineText(key);

        if (!sanitizedKey || sanitizedKey === '[redacted]') {
          return metadata;
        }

        if (isMetadataScalar(rawValue)) {
          metadata[sanitizedKey] =
            typeof rawValue === 'string'
              ? (sanitizeOperationsTimelineText(rawValue) ?? null)
              : rawValue;
        }

        return metadata;
      },
      {},
    );
}

function isMetadataScalar(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
