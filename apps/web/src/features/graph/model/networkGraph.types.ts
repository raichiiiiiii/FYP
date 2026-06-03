import type { AppRoleCode } from '../../../shared/types'

export type NetworkNodeType =
  | 'organization'
  | 'supplier'
  | 'buyer'
  | 'financier'
  | 'opportunity'
  | 'application'
  | 'document'

export type NetworkRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type NetworkRelationship =
  | 'supplies'
  | 'buys_from'
  | 'finances'
  | 'supports'
  | 'evidences'
  | 'anchors'

export type NetworkNode = {
  id: string
  type: NetworkNodeType
  label: string
  subtitle?: string
  status?: string
  riskLevel?: NetworkRiskLevel
  visibleToRoles: AppRoleCode[]
  sourcePath: string
  entityType: string
  entityId: string
  position: {
    x: number
    y: number
  }
}

export type NetworkEdge = {
  id: string
  source: string
  target: string
  relationship: NetworkRelationship
  label?: string
  visibleToRoles?: AppRoleCode[]
}

export type NetworkGraph = {
  id: string
  label: string
  status?: string
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  visibility: {
    roleCodes: AppRoleCode[]
    financeNodesIncluded: boolean
    hiddenNodeCount: number
    hiddenEdgeCount: number
  }
}

export type ProjectGraphApiNode = {
  id: string
  entityType: string
  entityId: string
  label: string
  subtitle?: string
  status?: string
  category: 'organization' | 'party' | 'procurement' | 'evidence' | 'finance'
  sourcePath: string
  position: {
    x: number
    y: number
  }
}

export type ProjectGraphApiEdge = {
  id: string
  sourceNodeId: string
  targetNodeId: string
  label: string
}

export type ProjectGraphApi = {
  project: {
    id: string
    name: string
    status: string
  }
  visibility: {
    roleCodes: string[]
    financeNodesIncluded: boolean
  }
  nodes: ProjectGraphApiNode[]
  edges: ProjectGraphApiEdge[]
}
