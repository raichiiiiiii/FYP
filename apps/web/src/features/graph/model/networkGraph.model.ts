import type { AppRoleCode } from '../../../shared/types'
import type {
  NetworkEdge,
  NetworkGraph,
  NetworkNode,
  NetworkNodeType,
  NetworkRelationship,
  NetworkRiskLevel,
  ProjectGraphFilters,
  ProjectGraphApi,
  ProjectGraphApiEdge,
  ProjectGraphApiNode,
} from './networkGraph.types'

const graphVisibleRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'PROCUREMENT_OFFICER',
  'APPROVER',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
]

const financeVisibleRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
]

const procurementVisibleRoles: AppRoleCode[] = [
  'ORG_ADMIN',
  'PROCUREMENT_OFFICER',
  'APPROVER',
  'FINANCE_ACCOUNTANT',
  'FINANCIER_USER',
  'SHARIAH_REVIEWER',
  'AUDITOR',
]

export function mapProjectGraphApiToNetworkGraph(
  apiGraph: ProjectGraphApi,
): NetworkGraph {
  const nodes = apiGraph.nodes.map(mapApiNode)
  const withFinanceWorkspace = addFinancierWorkspaceNode(nodes, apiGraph)
  const edges = [
    ...apiGraph.edges.map(mapApiEdge),
    ...financierWorkspaceEdges(withFinanceWorkspace),
  ]

  return {
    id: apiGraph.project.id,
    label: apiGraph.project.name,
    status: apiGraph.project.status,
    nodes: withFinanceWorkspace,
    edges,
    visibility: {
      roleCodes: normalizeRoleCodes(apiGraph.visibility.roleCodes),
      financeNodesIncluded: apiGraph.visibility.financeNodesIncluded,
      hiddenNodeCount: 0,
      hiddenEdgeCount: 0,
    },
  }
}

export function filterNetworkGraphForRoles(
  graph: NetworkGraph,
  roleCodes: readonly AppRoleCode[],
): NetworkGraph {
  const visibleNodeIds = new Set<string>()
  const nodes = graph.nodes.filter((node) => {
    const visible = intersects(roleCodes, node.visibleToRoles)

    if (visible) {
      visibleNodeIds.add(node.id)
    }

    return visible
  })
  const edges = graph.edges.filter((edge) => {
    const endpointVisible =
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    const roleVisible = !edge.visibleToRoles || intersects(roleCodes, edge.visibleToRoles)

    return endpointVisible && roleVisible
  })

  return {
    ...graph,
    nodes,
    edges,
    visibility: {
      ...graph.visibility,
      roleCodes: [...roleCodes],
      financeNodesIncluded: nodes.some((node) => isFinanceNodeType(node.type)),
      hiddenNodeCount: graph.nodes.length - nodes.length,
      hiddenEdgeCount: graph.edges.length - edges.length,
    },
  }
}

export function filterNetworkGraphByView(
  graph: NetworkGraph,
  options: ProjectGraphFilters,
): NetworkGraph {
  const nodeType = options.nodeType ?? 'all'
  const riskLevel = options.riskLevel ?? 'all'
  const includeFinance = options.includeFinance ?? true
  const includeAnchors = options.includeAnchors ?? true
  const status = normalizeStatusFilter(options.status)
  const visibleNodeIds = new Set<string>()
  const nodes = graph.nodes.filter((node) => {
    if (!includeFinance && isFinanceNodeType(node.type)) {
      return false
    }

    if (!includeAnchors && (node.type === 'hash_record' || node.type === 'anchor')) {
      return false
    }

    if (nodeType !== 'all' && node.type !== nodeType) {
      return false
    }

    if (riskLevel !== 'all' && node.riskLevel !== riskLevel) {
      return false
    }

    if (status && normalizeStatusFilter(node.status) !== status) {
      return false
    }

    visibleNodeIds.add(node.id)
    return true
  })
  const edges = graph.edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  )

  return {
    ...graph,
    nodes,
    edges,
    visibility: {
      ...graph.visibility,
      financeNodesIncluded: nodes.some((node) => isFinanceNodeType(node.type)),
    },
  }
}

export function summarizeNetworkGraph(graph: NetworkGraph) {
  const riskCounts = graph.nodes.reduce(
    (counts, node) => {
      const risk = node.riskLevel ?? 'low'
      counts[risk] += 1
      return counts
    },
    {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    } satisfies Record<NetworkRiskLevel, number>,
  )

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    financeNodeCount: graph.nodes.filter((node) => isFinanceNodeType(node.type)).length,
    documentNodeCount: graph.nodes.filter((node) => node.type === 'document').length,
    hiddenNodeCount: graph.visibility.hiddenNodeCount,
    riskCounts,
  }
}

function mapApiNode(node: ProjectGraphApiNode): NetworkNode {
  const type = nodeTypeFor(node)

  return {
    id: node.id,
    type,
    label: node.label,
    subtitle: node.subtitle,
    status: node.status,
    riskLevel: node.risk?.riskLevel ?? riskLevelFor(node.status),
    riskReasons: node.risk?.riskReasons ?? [],
    riskSourceEntityIds: node.risk?.sourceEntityIds ?? [],
    riskVisibilityScope: node.risk?.visibilityScope,
    visibleToRoles: visibleRolesFor(type),
    sourcePath: node.sourcePath,
    entityType: node.entityType,
    entityId: node.entityId,
    position: node.position,
  }
}

function mapApiEdge(edge: ProjectGraphApiEdge): NetworkEdge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    relationship: relationshipFor(edge.label),
    label: edge.label,
  }
}

function addFinancierWorkspaceNode(
  nodes: NetworkNode[],
  apiGraph: ProjectGraphApi,
): NetworkNode[] {
  const hasFinanceRecords = nodes.some(
    (node) => node.type === 'opportunity' || node.type === 'application',
  )

  if (!apiGraph.visibility.financeNodesIncluded || !hasFinanceRecords) {
    return nodes
  }

  const workspaceNode: NetworkNode = {
    id: `Financier:${apiGraph.project.id}`,
    type: 'financier',
    label: 'Financier review workspace',
    subtitle: 'Scoped capital provider view',
    status: 'SCOPED',
    riskLevel: 'medium',
    visibleToRoles: financeVisibleRoles,
    sourcePath: '/finance/applications',
    entityType: 'FinancierWorkspace',
    entityId: apiGraph.project.id,
    position: {
      x: 80,
      y: 620,
    },
  }

  return [...nodes, workspaceNode]
}

function financierWorkspaceEdges(nodes: NetworkNode[]): NetworkEdge[] {
  const financier = nodes.find((node) => node.type === 'financier')

  if (!financier) {
    return []
  }

  return nodes
    .filter((node) => node.type === 'opportunity' || node.type === 'application')
    .map((node) => ({
      id: `${financier.id}:finances:${node.id}`,
      source: financier.id,
      target: node.id,
      relationship: 'finances',
      label: 'finances',
      visibleToRoles: financeVisibleRoles,
    }))
}

function nodeTypeFor(node: ProjectGraphApiNode): NetworkNodeType {
  if (node.entityType === 'Organization') {
    return 'organization'
  }

  if (node.entityType === 'Supplier') {
    return 'supplier'
  }

  if (node.entityType === 'BuyerCustomer') {
    return 'buyer'
  }

  if (node.entityType === 'ProcurementOpportunity') {
    return 'opportunity'
  }

  if (node.entityType === 'MudarabahApplication') {
    return 'application'
  }

  if (node.entityType === 'HashRecord') {
    return 'hash_record'
  }

  if (node.entityType === 'AuditAnchor') {
    return 'anchor'
  }

  return 'document'
}

function visibleRolesFor(type: NetworkNodeType): AppRoleCode[] {
  if (isFinanceNodeType(type)) {
    return financeVisibleRoles
  }

  if (type === 'document' || type === 'hash_record' || type === 'anchor') {
    return procurementVisibleRoles
  }

  return graphVisibleRoles
}

function relationshipFor(label: string): NetworkRelationship {
  const normalized = label.trim().toLowerCase()

  if (normalized === 'supplies') {
    return 'supplies'
  }

  if (normalized === 'buys from' || normalized === 'buys for') {
    return 'buys_from'
  }

  if (normalized === 'funds') {
    return 'finances'
  }

  if (normalized === 'evidences') {
    return 'evidences'
  }

  if (normalized === 'verifies') {
    return 'verifies'
  }

  if (normalized.includes('anchor')) {
    return 'anchors'
  }

  return 'supports'
}

function riskLevelFor(status?: string): NetworkRiskLevel {
  const normalized = status?.trim().toUpperCase() ?? ''

  if (
    normalized.includes('FAILED') ||
    normalized.includes('LOSS_EXCEPTION') ||
    normalized.includes('BLOCKED')
  ) {
    return 'critical'
  }

  if (
    normalized.includes('REJECTED') ||
    normalized.includes('CANCELLED') ||
    normalized.includes('OVERDUE')
  ) {
    return 'high'
  }

  if (
    normalized.includes('PENDING') ||
    normalized.includes('DRAFT') ||
    normalized.includes('SUBMITTED') ||
    normalized.includes('REVIEW') ||
    normalized.includes('MONITORING') ||
    normalized.includes('SCOPED')
  ) {
    return 'medium'
  }

  return 'low'
}

function normalizeStatusFilter(status?: string) {
  const normalized = status?.trim().toUpperCase() ?? ''

  return normalized === 'ALL' ? '' : normalized
}

function isFinanceNodeType(type: NetworkNodeType) {
  return type === 'financier' || type === 'opportunity' || type === 'application'
}

function intersects(
  roleCodes: readonly AppRoleCode[],
  visibleToRoles: readonly AppRoleCode[],
) {
  return roleCodes.some((roleCode) => visibleToRoles.includes(roleCode))
}

function normalizeRoleCodes(roleCodes: readonly string[]): AppRoleCode[] {
  return roleCodes.filter((roleCode): roleCode is AppRoleCode =>
    graphVisibleRoles.includes(roleCode as AppRoleCode),
  )
}
