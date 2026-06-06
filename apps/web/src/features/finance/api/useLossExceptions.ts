import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useLossExceptions(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId
  const actorUserId = session.actorUserId

  const listLossExceptions = useCallback(
    <T>(applicationId?: string | null) => {
      if (!organizationId || !actorUserId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.finance.lossExceptions(
          organizationId,
          applicationId,
          actorUserId,
        ),
        endpoints.lossExceptions.list(organizationId, applicationId, actorUserId),
      )
    },
    [actorUserId, fetchQuery, organizationId],
  )

  const invalidationKeys = useCallback(
    (applicationId?: string | null) => [
      queryKeys.finance.lossExceptions(organizationId, applicationId, actorUserId),
      queryKeys.finance.applications(organizationId),
      queryKeys.finance.application(applicationId),
      queryKeys.finance.closures(organizationId),
    ],
    [actorUserId, organizationId],
  )

  const createLossException = useCallback(
    <T>(body: ApiBody, applicationId?: string | null) =>
      mutate<T>({
        path: endpoints.lossExceptions.create,
        method: 'POST',
        body,
        invalidate: invalidationKeys(applicationId),
      }),
    [invalidationKeys, mutate],
  )

  const attachEvidence = useCallback(
    <T>(id: string, body: ApiBody, applicationId?: string | null) =>
      mutate<T>({
        path: endpoints.lossExceptions.evidence(id),
        method: 'POST',
        body,
        invalidate: invalidationKeys(applicationId),
      }),
    [invalidationKeys, mutate],
  )

  const classifyLossException = useCallback(
    <T>(id: string, body: ApiBody, applicationId?: string | null) =>
      mutate<T>({
        path: endpoints.lossExceptions.decision(id),
        method: 'POST',
        body,
        invalidate: invalidationKeys(applicationId),
      }),
    [invalidationKeys, mutate],
  )

  const resolveLossException = useCallback(
    <T>(id: string, body: ApiBody, applicationId?: string | null) =>
      mutate<T>({
        path: endpoints.lossExceptions.close(id),
        method: 'POST',
        body,
        invalidate: invalidationKeys(applicationId),
      }),
    [invalidationKeys, mutate],
  )

  return {
    listLossExceptions,
    createLossException,
    attachEvidence,
    classifyLossException,
    resolveLossException,
  }
}
