import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useClosures(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listClosures = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.finance.closures(organizationId),
        endpoints.closures.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createClosure = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.closures.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.closures(organizationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return { listClosures, createClosure }
}
