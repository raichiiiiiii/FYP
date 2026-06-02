import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { httpClient } from '../../../shared/api/http-client'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useEvidencePacks(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listEvidencePacks = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.evidence.evidencePacks(organizationId),
        endpoints.evidencePacks.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const createEvidencePack = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.evidencePacks.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.evidence.evidencePacks(organizationId)],
      }),
    [mutate, organizationId],
  )

  const getEvidencePack = useCallback(
    <T>(id: string) =>
      fetchQuery<T>(
        queryKeys.evidence.evidencePack(id),
        endpoints.evidencePacks.detail(id),
      ),
    [fetchQuery],
  )

  const exportEvidencePack = useCallback(
    <T>(id: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.evidencePacks.export(id),
        method: 'POST',
        body,
        invalidate: [queryKeys.evidence.evidencePacks(organizationId)],
      }),
    [mutate, organizationId],
  )

  const downloadEvidencePackExport = useCallback(
    (id: string, format: 'json' | 'pdf') =>
      httpClient.blob(
        endpoints.evidencePacks.downloadExport(
          id,
          format,
          session.actorUserId,
        ),
      ),
    [session.actorUserId],
  )

  return {
    listEvidencePacks,
    getEvidencePack,
    createEvidencePack,
    exportEvidencePack,
    downloadEvidencePackExport,
  }
}
