import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useRfqs(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listRfqs = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.rfqs(organizationId),
        endpoints.rfqs.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const getRfq = useCallback(
    <T>(rfqId: string) =>
      fetchQuery<T>(
        queryKeys.procurement.rfq(rfqId),
        endpoints.rfqs.detail(rfqId),
      ),
    [fetchQuery],
  )

  const createRfq = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.rfqs.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.procurement.rfqs(organizationId),
          queryKeys.procurement.requisitions(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const publishRfq = useCallback(
    <T>(id: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.rfqs.publish(id),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.procurement.rfqs(organizationId),
          queryKeys.procurement.requisitions(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return { listRfqs, getRfq, createRfq, publishRfq }
}
