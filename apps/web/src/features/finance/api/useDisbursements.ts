import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

type ApiBody = Record<string, unknown>

export function useDisbursements(session: AppSession) {
  const { mutate } = useApiData()
  const organizationId = session.organizationId

  const createDisbursement = useCallback(
    <T>(body: ApiBody) =>
      mutate<T>({
        path: endpoints.disbursements.create,
        method: 'POST',
        body,
        invalidate: [
          queryKeys.finance.applications(organizationId),
          queryKeys.finance.contracts(organizationId),
        ],
      }),
    [mutate, organizationId],
  )

  return { createDisbursement }
}
