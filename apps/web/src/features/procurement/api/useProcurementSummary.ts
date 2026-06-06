import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type {
  AppRoleCode,
  AppSession,
  ProcurementSummary,
} from '../../../shared/types'

export function useProcurementSummary(
  session: AppSession,
  roleCodes: AppRoleCode[],
) {
  const { fetchQuery } = useApiData()
  const organizationId = session.organizationId

  const getProcurementSummary = useCallback(() => {
    if (!organizationId) {
      return Promise.reject(new Error('Organization session is required'))
    }

    return fetchQuery<ProcurementSummary>(
      queryKeys.procurement.summary(organizationId, roleCodes),
      endpoints.procurementOperations.summary(
        organizationId,
        roleCodes.join(','),
      ),
    )
  }, [fetchQuery, organizationId, roleCodes])

  return { getProcurementSummary }
}
