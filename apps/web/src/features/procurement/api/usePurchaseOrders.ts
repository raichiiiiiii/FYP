import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function usePurchaseOrders(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listPurchaseOrders = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.purchaseOrders(organizationId),
        endpoints.purchaseOrders.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const getPurchaseOrder = useCallback(
    <T>(purchaseOrderId: string) =>
      fetchQuery<T>(
        queryKeys.procurement.purchaseOrder(purchaseOrderId),
        endpoints.purchaseOrders.detail(purchaseOrderId),
      ),
    [fetchQuery],
  )

  const createPurchaseOrder = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.purchaseOrders.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.procurement.purchaseOrders(organizationId),
          queryKeys.procurement.quotations(organizationId),
          queryKeys.procurement.requisitions(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const issuePurchaseOrder = useCallback(
    <T>(id: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.purchaseOrders.issue(id),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.procurement.purchaseOrder(id),
          queryKeys.procurement.purchaseOrders(organizationId),
          queryKeys.procurement.requisitions(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return {
    listPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
    issuePurchaseOrder,
  }
}
