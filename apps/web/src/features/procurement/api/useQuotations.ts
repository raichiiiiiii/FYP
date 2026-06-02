import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useQuotations(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listQuotations = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.quotations(organizationId),
        endpoints.quotations.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createQuotation = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.quotations.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.procurement.quotations(organizationId),
          queryKeys.procurement.rfqs(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return { listQuotations, createQuotation }
}
