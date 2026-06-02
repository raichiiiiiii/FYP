import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

export function useProjectGraph(session: AppSession) {
  const { fetchQuery } = useApiData()

  const getProjectGraph = useCallback(
    <T>(projectId: string) => {
      if (!session.organizationId || !session.actorUserId) {
        return Promise.reject(new Error('Active organization session required'))
      }

      return fetchQuery<T>(
        queryKeys.graph.project(
          session.organizationId,
          session.actorUserId,
          projectId,
        ),
        endpoints.graph.project(
          projectId,
          session.organizationId,
          session.actorUserId,
        ),
      )
    },
    [fetchQuery, session.actorUserId, session.organizationId],
  )

  return { getProjectGraph }
}
