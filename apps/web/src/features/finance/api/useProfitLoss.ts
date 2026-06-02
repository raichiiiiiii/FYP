import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useProfitLoss(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listProfitLossStatements = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.finance.profitLoss(organizationId),
        endpoints.profitLoss.statements(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createProfitLossStatement = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.profitLoss.createStatement,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.profitLoss(organizationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return { listProfitLossStatements, createProfitLossStatement }
}
