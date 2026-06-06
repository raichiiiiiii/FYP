import { useCallback, useMemo } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'
import type { ProjectGraphFilters } from '../model/networkGraph.types'

export type GraphSavedView = {
  id: string
  organizationId: string
  ownerUserId: string
  name: string
  filters: ProjectGraphFilters
  layout?: {
    zoom?: number
  } | null
  visibility: 'private' | 'organization'
  createdAt: string
  updatedAt: string
}

type SaveGraphViewInput = {
  name: string
  filters: ProjectGraphFilters
  layout?: {
    zoom?: number
  }
  visibility?: 'private' | 'organization'
}

export function useGraphSavedViews(session: AppSession) {
  const { fetchQuery, mutate } = useApiData()
  const viewsKey = useMemo(
    () => queryKeys.graph.views(session.organizationId, session.actorUserId),
    [session.actorUserId, session.organizationId],
  )

  const listSavedViews = useCallback(() => {
    if (!session.organizationId || !session.actorUserId) {
      return Promise.reject(new Error('Active organization session required'))
    }

    return fetchQuery<GraphSavedView[]>(
      viewsKey,
      endpoints.graph.views(session.organizationId, session.actorUserId),
    )
  }, [fetchQuery, session.actorUserId, session.organizationId, viewsKey])

  const createSavedView = useCallback(
    (input: SaveGraphViewInput) => {
      if (!session.organizationId || !session.actorUserId) {
        return Promise.reject(new Error('Active organization session required'))
      }

      return mutate<GraphSavedView>({
        path: endpoints.graph.createView,
        method: 'POST',
        body: {
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
          visibility: 'private',
          ...input,
        },
        invalidate: [viewsKey],
      })
    },
    [mutate, session.actorUserId, session.organizationId, viewsKey],
  )

  const updateSavedView = useCallback(
    (viewId: string, input: SaveGraphViewInput) => {
      if (!session.organizationId || !session.actorUserId) {
        return Promise.reject(new Error('Active organization session required'))
      }

      return mutate<GraphSavedView>({
        path: endpoints.graph.updateView(viewId),
        method: 'PATCH',
        body: {
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
          ...input,
        },
        invalidate: [viewsKey],
      })
    },
    [mutate, session.actorUserId, session.organizationId, viewsKey],
  )

  const deleteSavedView = useCallback(
    (viewId: string) => {
      if (!session.organizationId || !session.actorUserId) {
        return Promise.reject(new Error('Active organization session required'))
      }

      return mutate<GraphSavedView>({
        path: endpoints.graph.deleteView(viewId),
        method: 'DELETE',
        body: {
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
        },
        invalidate: [viewsKey],
      })
    },
    [mutate, session.actorUserId, session.organizationId, viewsKey],
  )

  return {
    listSavedViews,
    createSavedView,
    updateSavedView,
    deleteSavedView,
  }
}
