import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>
type ReviewAction = 'due-diligence' | 'shariah-review' | 'approve' | 'reject'

export function useApplications(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const organizationId = session.organizationId

  const listApplications = useCallback(
    <T>() => {
      if (!organizationId) {
        return Promise.resolve([] as T[])
      }

      return fetchQuery<T[]>(
        queryKeys.finance.applications(organizationId),
        endpoints.applications.list(organizationId),
      )
    },
    [fetchQuery, organizationId],
  )

  const getApplication = useCallback(
    <T>(applicationId: string) =>
      fetchQuery<T>(
        queryKeys.finance.application(applicationId),
        endpoints.applications.detail(applicationId),
      ),
    [fetchQuery],
  )

  const createApplication = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.applications.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.applications(organizationId),
          queryKeys.finance.opportunities(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const submitApplication = useCallback(
    <T>(applicationId: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.applications.submit(applicationId),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.application(applicationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const createEvidenceChecklist = useCallback(
    <T>(applicationId: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.applications.evidenceChecklist(applicationId),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.application(applicationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const completeChecklistItem = useCallback(
    <T>(itemId: string, applicationId: string, body: ApiBody) =>
      mutate<T>({
        path: endpoints.evidenceChecklists.completeItem(itemId),
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.application(applicationId),
          queryKeys.finance.applications(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  const runApplicationAction = useCallback(
    <T>(applicationId: string, action: ReviewAction, body: ApiBody) => {
      const path = {
        'due-diligence': endpoints.applications.dueDiligence(applicationId),
        'shariah-review': endpoints.applications.shariahReview(applicationId),
        approve: endpoints.applications.approve(applicationId),
        reject: endpoints.applications.reject(applicationId),
      }[action]

      return mutate<T>({
        path,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.application(applicationId),
          queryKeys.finance.applications(organizationId),
          queryKeys.finance.contracts(organizationId),
        ],
      })
    },
    [mutate, organizationId],
  )

  return {
    listApplications,
    getApplication,
    createApplication,
    submitApplication,
    createEvidenceChecklist,
    completeChecklistItem,
    runApplicationAction,
  }
}
