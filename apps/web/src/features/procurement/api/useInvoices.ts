import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useInvoices(session: AppSession) {
  const { mutate } = useApiData()
  const organizationId = session.organizationId

  const createInvoice = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.invoices.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.procurement.purchaseOrders(organizationId)],
      }),
    [mutate, organizationId],
  )

  return { createInvoice }
}
