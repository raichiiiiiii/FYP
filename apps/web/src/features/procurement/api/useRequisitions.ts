import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>
type RequisitionAction = 'submit' | 'approve' | 'reject'

export function useRequisitions(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listRequisitions = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.requisitions(organizationId),
        endpoints.requisitions.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const getRequisition = useCallback(
    <T>(requisitionId: string) =>
      fetchQuery<T>(
        queryKeys.procurement.requisition(requisitionId),
        endpoints.requisitions.detail(requisitionId),
      ),
    [fetchQuery],
  )

  const createRequisition = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.requisitions.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.procurement.requisitions(organizationId),
          queryKeys.procurement.projects(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const transitionRequisition = useCallback(
    <T>(id: string, action: RequisitionAction, body: ApiBody) =>
      mutate<T>({
        path: endpoints.requisitions.transition(id, action),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.procurement.requisition(id),
          queryKeys.procurement.requisitions(organizationId),
          queryKeys.procurement.projects(organizationId),
          queryKeys.procurement.approvals(organizationId, session.actorUserId),
        ],
      }),
    [mutate, organizationId, session.actorUserId],
  )

  return {
    listRequisitions,
    getRequisition,
    createRequisition,
    transitionRequisition,
  }
}
