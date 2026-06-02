import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

export type AuditSearchParams = {
  eventType?: string
  actorUserId?: string
  entityType?: string
  entityId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export function useAuditEvents(session: AppSession) {
  const { fetchQuery } = useApiData()
  const organizationId = session.organizationId

  const listAuditEvents = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.audit.events(organizationId),
        endpoints.auditEvents.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const searchAuditEvents = useCallback(
    <T>(params: AuditSearchParams = {}) =>
      fetchQuery<T>(
        queryKeys.audit.search(organizationId, params),
        endpoints.auditEvents.search({
          organizationId,
          ...params,
        }),
      ),
    [fetchQuery, organizationId],
  )

  const listEntityTimeline = useCallback(
    <T>(entityType: string, entityId: string) =>
      fetchQuery<T[]>(
        queryKeys.evidence.auditTimeline(organizationId, entityType, entityId),
        endpoints.auditEvents.entityTimeline(
          entityType,
          entityId,
          organizationId,
        ),
      ),
    [fetchQuery, organizationId],
  )

  return { listAuditEvents, searchAuditEvents, listEntityTimeline }
}
