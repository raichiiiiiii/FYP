import type { SummaryMetric, SummarySeverity } from '../../shared/types'

export type SummaryTone = 'blue' | 'green' | 'red' | 'amber' | 'purple'

export function findSummaryMetric(
  metrics: readonly SummaryMetric[],
  id: string,
) {
  return metrics.find((metric) => metric.id === id)
}

export function summaryToneForSeverity(
  severity?: SummarySeverity,
): SummaryTone {
  if (severity === 'success') {
    return 'green'
  }

  if (severity === 'warning') {
    return 'amber'
  }

  if (severity === 'danger') {
    return 'red'
  }

  return 'blue'
}
