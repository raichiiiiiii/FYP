import type {
  OperationsTimelineCategory,
  OperationsTimelineItem,
} from '../integrations/api/useIntegrations'

export type OperationsTimelineFilter =
  | 'all'
  | OperationsTimelineCategory
  | 'errors'

export function filterTimelineItems(
  items: OperationsTimelineItem[],
  activeFilter: OperationsTimelineFilter,
) {
  if (activeFilter === 'all') {
    return items
  }

  if (activeFilter === 'errors') {
    return items.filter((item) => item.severity === 'error')
  }

  return items.filter((item) => item.category === activeFilter)
}
