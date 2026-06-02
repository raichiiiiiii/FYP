import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useOpportunities(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listOpportunities = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.finance.opportunities(organizationId),
        endpoints.opportunities.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createOpportunity = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.opportunities.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.finance.opportunities(organizationId)],
      }),
    [mutate, organizationId],
  )

  return { listOpportunities, createOpportunity }
}
