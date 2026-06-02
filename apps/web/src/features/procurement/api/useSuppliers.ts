import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useSuppliers(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listSuppliers = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.suppliers(organizationId),
        endpoints.suppliers.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const getSupplier = useCallback(
    <T>(supplierId: string) =>
      fetchQuery<T>(
        queryKeys.procurement.supplier(supplierId),
        endpoints.suppliers.detail(supplierId),
      ),
    [fetchQuery],
  )

  const createSupplier = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.suppliers.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.procurement.suppliers(organizationId)],
      }),
    [mutate, organizationId],
  )

  return { listSuppliers, getSupplier, createSupplier }
}
