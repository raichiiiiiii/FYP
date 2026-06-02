import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useEvidenceItems(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listEvidenceItems = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.evidence.evidenceItems(organizationId),
        endpoints.evidenceItems.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createEvidenceItem = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.evidenceItems.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.evidence.evidenceItems(organizationId),
          queryKeys.evidence.evidencePacks(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return { listEvidenceItems, createEvidenceItem }
}
