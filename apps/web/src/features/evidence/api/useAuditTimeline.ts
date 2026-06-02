import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

export function useAuditTimeline(session: AppSession) {
  const { fetchQuery } = useApiData()
  const organizationId = session.organizationId

  const listAuditTimeline = useCallback(
    <T>(entityType: string, entityId: string) => {
      if (!organizationId || !entityType || !entityId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.evidence.auditTimeline(organizationId, entityType, entityId),
        endpoints.auditEvents.entityTimeline(entityType, entityId, organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  return { listAuditTimeline }
}
