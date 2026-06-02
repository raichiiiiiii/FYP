import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useProjects(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listProjects = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.projects(organizationId),
        endpoints.projects.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createProject = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.projects.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.procurement.projects(organizationId)],
      }),
    [mutate, organizationId],
  )

  return { listProjects, createProject }
}
