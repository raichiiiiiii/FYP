import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useApprovalRules(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listApprovalRules = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.procurement.approvalRules(organizationId),
        endpoints.procurementOperations.approvalRules(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createApprovalRule = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.procurementOperations.approvalRules(),
        method: 'POST',
        body,
        invalidate: [queryKeys.procurement.approvalRules(organizationId)],
      }),
    [mutate, organizationId],
  )

  const updateApprovalRule = useCallback(
    <T>(id: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.procurementOperations.approvalRule(id),
        method: 'PATCH',
        body,
        invalidate: [queryKeys.procurement.approvalRules(organizationId)],
      }),
    [mutate, organizationId],
  )

  return { listApprovalRules, createApprovalRule, updateApprovalRule }
}
