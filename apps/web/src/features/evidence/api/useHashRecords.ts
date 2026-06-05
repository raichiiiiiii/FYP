import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useHashRecords(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const createHashRecord = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.hashRecords.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.evidence.hashRecords(organizationId)],
      }),
    [mutate, organizationId],
  )

  const verifyHashRecord = useCallback(
    <T>(id: string) =>
      mutate<T>({
        path: endpoints.hashRecords.verify(id),
        method: 'GET',
      }),
    [mutate],
  )

  const verifyFabricAnchor = useCallback(
    <T>(id: string) =>
      mutate<T>({
        path: endpoints.hashRecords.fabricVerification(id),
        method: 'GET',
      }),
    [mutate],
  )

  const getHashRecord = useCallback(
    <T>(id: string) =>
      fetchQuery<T>(
        queryKeys.evidence.hashRecord(id),
        endpoints.hashRecords.detail(id),
      ),
    [fetchQuery],
  )

  return {
    createHashRecord,
    getHashRecord,
    verifyHashRecord,
    verifyFabricAnchor,
  }
}
