import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useReceipts(session: AppSession) {
  const { mutate } = useApiData()
  const organizationId = session.organizationId

  const createReceipt = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.receipts.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.procurement.purchaseOrders(organizationId)],
      }),
    [mutate, organizationId],
  )

  return { createReceipt }
}
