import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

export function useMatching(session: AppSession) {
  const { fetchQuery } = useApiData()
  const organizationId = session.organizationId

  const listMatchingRecords = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.matching(organizationId),
        endpoints.procurementOperations.matching(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  return { listMatchingRecords }
}
