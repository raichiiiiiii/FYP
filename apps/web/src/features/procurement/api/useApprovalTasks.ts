import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

export function useApprovalTasks(session: AppSession) {
  const { fetchQuery } = useApiData()
  const organizationId = session.organizationId
  const actorUserId = session.actorUserId

  const listApprovalTasks = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.approvals(organizationId, actorUserId),
        endpoints.procurementOperations.approvals(organizationId, actorUserId),
      )
    },
    [actorUserId, fetchQuery, organizationId],
  )

  return { listApprovalTasks }
}
