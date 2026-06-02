import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { httpClient } from '../../../shared/api/http-client'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useDocuments(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listDocuments = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.evidence.documents(organizationId),
        endpoints.documents.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const getDocument = useCallback(
    <T>(id: string) =>
      fetchQuery<T>(
        queryKeys.evidence.document(id),
        endpoints.documents.detail(id),
      ),
    [fetchQuery],
  )

  const createDocument = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.documents.create,
        method: 'POST',
        body,
        invalidate: [queryKeys.evidence.documents(organizationId)],
      }),
    [mutate, organizationId],
  )

  const uploadDocument = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.documents.upload,
        method: 'POST',
        body,
        invalidate: [queryKeys.evidence.documents(organizationId)],
      }),
    [mutate, organizationId],
  )

  const uploadDocumentVersion = useCallback(
    <T>(id: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.documents.uploadVersion(id),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.evidence.documents(organizationId),
          queryKeys.evidence.document(id),
        ],
      }),
    [mutate, organizationId],
  )

  const previewDocumentVersion = useCallback(
    <T>(id: string, versionId: string) =>
      fetchQuery<T>(
        ['evidence', 'document-version-preview', id, versionId],
        endpoints.documents.previewVersion(id, versionId),
      ),
    [fetchQuery],
  )

  const downloadDocumentVersion = useCallback(
    (id: string, versionId: string) =>
      httpClient.blob(endpoints.documents.downloadVersion(id, versionId)),
    [],
  )

  return {
    listDocuments,
    getDocument,
    createDocument,
    uploadDocument,
    uploadDocumentVersion,
    previewDocumentVersion,
    downloadDocumentVersion,
  }
}
