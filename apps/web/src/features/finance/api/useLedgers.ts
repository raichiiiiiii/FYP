import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useLedgers(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listLedgerEntries = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.finance.ledgers(organizationId),
        endpoints.ledgers.entries(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createLedgerEntry = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.ledgers.createEntry,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.ledgers(organizationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return { listLedgerEntries, createLedgerEntry }
}
