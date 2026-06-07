import { useCallback } from 'react'

import { endpoints } from '../../../shared/api/endpoints'
import { queryKeys } from '../../../shared/api/query-client'
import { useApiData } from '../../../shared/api/useApiData'
import type { AppSession } from '../../../shared/types'

export type NodeFederationCanvasNode = {
  id: string
  type: 'node_deployment' | 'peer_node' | 'simulated_channel'
  label: string
  status: string
  nodeKey?: string
  nodeType?: string
  channelType?: string
}

export type NodeFederationCanvasEdge = {
  id: string
  source: string
  target: string
  type:
    | 'hosts'
    | 'peers_with'
    | 'participates_in_channel'
    | 'shares_finance_data_on'
    | 'private_channel'
  label: string
}

export type NodeFederationCanvas = {
  nodes: NodeFederationCanvasNode[]
  edges: NodeFederationCanvasEdge[]
}

export function useNodeFederationCanvas(session: AppSession) {
  const { fetchQuery } = useApiData()

  const getNodeFederationCanvas = useCallback(
    (localNodeKey?: string | null) => {
      if (!session.organizationId || !session.actorUserId) {
        return Promise.reject(new Error('Active organization session required'))
      }

      return fetchQuery<NodeFederationCanvas>(
        queryKeys.nodeFederation.canvas(
          session.organizationId,
          session.actorUserId,
          localNodeKey,
        ),
        endpoints.nodeFederation.canvas(
          session.organizationId,
          session.actorUserId,
          localNodeKey,
        ),
      )
    },
    [fetchQuery, session.actorUserId, session.organizationId],
  )

  return { getNodeFederationCanvas }
}
