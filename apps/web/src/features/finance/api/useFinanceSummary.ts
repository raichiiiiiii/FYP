import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type {
  AppRoleCode,
  AppSession,
  FinanceSummary,
} from '../../../shared/types'

export function useFinanceSummary(
  session: AppSession,
  roleCodes: AppRoleCode[],
) {
  const { fetchQuery } = useApiData()
  const organizationId = session.organizationId

  const getFinanceSummary = useCallback(() => {
    if (!organizationId) {
      return Promise.reject(new Error('Organization session is required'))
    }

    return fetchQuery<FinanceSummary>(
      queryKeys.finance.summary(organizationId, roleCodes),
      endpoints.financeSummary.summary(organizationId, roleCodes.join(',')),
    )
  }, [fetchQuery, organizationId, roleCodes])

  return { getFinanceSummary }
}
