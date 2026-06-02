import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useContracts(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listContracts = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.finance.contracts(organizationId),
        endpoints.contracts.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createContract = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.contracts.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.contracts(organizationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const markContractSigned = useCallback(
    <T>(id: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.contracts.markSigned(id),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.contracts(organizationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const generateContractDocument = useCallback(
    <T>(id: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.contracts.generateDocument(id),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.contracts(organizationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return {
    listContracts,
    createContract,
    markContractSigned,
    generateContractDocument,
  }
}
