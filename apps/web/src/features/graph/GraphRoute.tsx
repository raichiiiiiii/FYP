import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '../../layouts/PageHeader'
import { Button } from '../../shared/components/Button'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppRoleCode, AppSession, LoadState } from '../../shared/types'
import { useProjects } from '../procurement/api/useProjects'
import { useProjectGraph } from './api/useProjectGraph'
import {
  filterNetworkGraphByView,
  filterNetworkGraphForRoles,
  mapProjectGraphApiToNetworkGraph,
  summarizeNetworkGraph,
} from './model/networkGraph.model'
import type {
  NetworkEdge,
  NetworkGraph,
  NetworkNode,
  NetworkNodeType,
  NetworkRelationship,
  NetworkRiskLevel,
  ProjectGraphApi,
} from './model/networkGraph.types'

type Project = {
  id: string
  name: string
  code?: string | null
  status: string
}

const nodeWidth = 172
const nodeHeight = 74
const minCanvasHeight = 720
const canvasWidth = 1040

const zoomOptions = [0.85, 1, 1.15]

const nodeTypeOptions: Array<NetworkNodeType | 'all'> = [
  'all',
  'organization',
  'supplier',
  'buyer',
  'financier',
  'opportunity',
  'application',
  'document',
  'hash_record',
  'anchor',
]

const riskOptions: Array<NetworkRiskLevel | 'all'> = [
  'all',
  'low',
  'medium',
  'high',
  'critical',
]

const nodeLegend: Array<{
  type: NetworkNodeType
  label: string
  description: string
}> = [
  {
    type: 'organization',
    label: 'Organization',
    description: 'Owning organization and project scope.',
  },
  {
    type: 'supplier',
    label: 'Supplier',
    description: 'Vendor or mudarib-side procurement party.',
  },
  {
    type: 'buyer',
    label: 'Buyer',
    description: 'Revenue source or customer-side party.',
  },
  {
    type: 'document',
    label: 'Record',
    description: 'Procurement, evidence, contract, or closure record.',
  },
  {
    type: 'hash_record',
    label: 'Hash record',
    description: 'Canonical hash proving a source record state.',
  },
  {
    type: 'anchor',
    label: 'Anchor',
    description: 'Fabric or mock anchor status for a hash record.',
  },
  {
    type: 'opportunity',
    label: 'Opportunity',
    description: 'Revenue-generating finance opportunity.',
  },
  {
    type: 'application',
    label: 'Application',
    description: 'Mudarabah capital application.',
  },
  {
    type: 'financier',
    label: 'Financier',
    description: 'Role-scoped financier review workspace.',
  },
]

const relationshipLegend: Array<{
  relationship: NetworkRelationship
  label: string
  description: string
}> = [
  {
    relationship: 'supplies',
    label: 'Supplies',
    description: 'Supplier provides goods or services.',
  },
  {
    relationship: 'buys_from',
    label: 'Buys from',
    description: 'Buyer/customer relationship.',
  },
  {
    relationship: 'finances',
    label: 'Finances',
    description: 'Restricted mudarabah finance relation.',
  },
  {
    relationship: 'evidences',
    label: 'Evidences',
    description: 'Record is backed by evidence.',
  },
  {
    relationship: 'verifies',
    label: 'Verifies',
    description: 'Hash record verifies a source record state.',
  },
  {
    relationship: 'anchors',
    label: 'Anchors',
    description: 'Hash or audit anchor relation if present.',
  },
  {
    relationship: 'supports',
    label: 'Supports',
    description: 'General workflow dependency.',
  },
]

export function GraphRoute({
  session,
  roleCodes,
}: {
  session: AppSession
  roleCodes: AppRoleCode[]
}) {
  const { listProjects } = useProjects(session)
  const { getProjectGraph } = useProjectGraph(session)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [nodeTypeFilter, setNodeTypeFilter] =
    useState<NetworkNodeType | 'all'>('all')
  const [riskFilter, setRiskFilter] = useState<NetworkRiskLevel | 'all'>('all')
  const [showFinance, setShowFinance] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [graphState, setGraphState] = useState<LoadState<ProjectGraphApi>>({
    status: 'loading',
  })

  const loadProjects = useCallback(() => listProjects<Project>(), [listProjects])

  useEffect(() => {
    let cancelled = false

    loadProjects()
      .then((rows) => {
        if (cancelled) {
          return
        }

        setProjects(rows)
        setProjectId((current) => current || rows[0]?.id || '')
        if (!rows.length) {
          setGraphState({ status: 'ready', data: emptyProjectGraph() })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setGraphState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Unable to load projects',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadProjects])

  useEffect(() => {
    if (!projectId) {
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setGraphState({ status: 'loading' })
        }

        return getProjectGraph<ProjectGraphApi>(projectId)
      })
      .then((graph) => {
        if (!cancelled) {
          setGraphState({ status: 'ready', data: graph })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setGraphState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load project graph',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [getProjectGraph, projectId])

  const authorizedGraph = useMemo(() => {
    if (graphState.status !== 'ready') {
      return null
    }

    return filterNetworkGraphForRoles(
      mapProjectGraphApiToNetworkGraph(graphState.data),
      roleCodes,
    )
  }, [graphState, roleCodes])
  const graph = useMemo(() => {
    if (!authorizedGraph) {
      return null
    }

    return filterNetworkGraphByView(authorizedGraph, {
      nodeType: nodeTypeFilter,
      riskLevel: riskFilter,
      showFinance,
    })
  }, [authorizedGraph, nodeTypeFilter, riskFilter, showFinance])
  const summary = graph ? summarizeNetworkGraph(graph) : null
  const selectedNode =
    graph?.nodes.find((node) => node.id === selectedNodeId) ??
    graph?.nodes[0] ??
    null

  const resetView = () => {
    setNodeTypeFilter('all')
    setRiskFilter('all')
    setShowFinance(true)
    setZoom(1)
    setSelectedNodeId('')
  }

  return (
    <>
      <PageHeader eyebrow="Graph/Canvas" title="Project network canvas" />
      <section className="graph-hero" aria-label="Network canvas overview">
        <div>
          <span>Read-only relationship map</span>
          <h2>Project, procurement, finance, and evidence context</h2>
          <p>
            This canvas visualizes records returned by the project graph API
            after role filtering. Source records remain authoritative; the graph
            does not edit workflow state.
          </p>
        </div>
        <div className="graph-hero-note">
          <strong>Permission filtered</strong>
          <span>
            Finance and evidence nodes appear only when the current role is
            authorized to inspect them.
          </span>
        </div>
      </section>
      <section className="form-grid graph-toolbar">
        <label className="field">
          <span>Project</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Node type</span>
          <select
            value={nodeTypeFilter}
            onChange={(event) =>
              setNodeTypeFilter(event.target.value as NetworkNodeType | 'all')
            }
          >
            {nodeTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All node types' : labelFor(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Risk</span>
          <select
            value={riskFilter}
            onChange={(event) =>
              setRiskFilter(event.target.value as NetworkRiskLevel | 'all')
            }
          >
            {riskOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All risks' : labelFor(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Zoom</span>
          <select
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            {zoomOptions.map((option) => (
              <option key={option} value={option}>
                {Math.round(option * 100)}%
              </option>
            ))}
          </select>
        </label>
        <label className="graph-toggle">
          <input
            type="checkbox"
            checked={showFinance}
            onChange={(event) => setShowFinance(event.target.checked)}
          />
          <span>Show finance layer</span>
        </label>
        <Button type="button" variant="secondary" onClick={resetView}>
          Reset view
        </Button>
        {graph ? (
          <div className="details-grid graph-summary">
            <article>
              <span>Nodes</span>
              <strong>{summary?.nodeCount ?? 0}</strong>
            </article>
            <article>
              <span>Edges</span>
              <strong>{summary?.edgeCount ?? 0}</strong>
            </article>
            <article>
              <span>Finance layer</span>
              <strong>
                {graph.visibility.financeNodesIncluded ? 'Visible' : 'Hidden'}
              </strong>
            </article>
            <article>
              <span>Hidden by role</span>
              <strong>{graph.visibility.hiddenNodeCount}</strong>
            </article>
            <article>
              <span>Hidden edges</span>
              <strong>{graph.visibility.hiddenEdgeCount}</strong>
            </article>
            <article>
              <span>Risk flags</span>
              <strong>
                {(summary?.riskCounts.high ?? 0) +
                  (summary?.riskCounts.critical ?? 0)}
              </strong>
            </article>
          </div>
        ) : null}
      </section>

      {graphState.status === 'loading' ? (
        <EmptyState>Loading project graph...</EmptyState>
      ) : null}
      {graphState.status === 'error' ? (
        <ErrorState message={graphState.message} />
      ) : null}
      {graph && graph.nodes.length ? (
        <GraphCanvas
          graph={graph}
          selectedNodeId={selectedNode?.id ?? ''}
          selectedNode={selectedNode}
          zoom={zoom}
          onSelectNode={setSelectedNodeId}
        />
      ) : null}
      {graph && !graph.nodes.length ? (
        <EmptyState>
          No authorized graph records match the current filters.
        </EmptyState>
      ) : null}
    </>
  )
}

function GraphCanvas({
  graph,
  selectedNode,
  selectedNodeId,
  zoom,
  onSelectNode,
}: {
  graph: NetworkGraph
  selectedNode: NetworkNode | null
  selectedNodeId: string
  zoom: number
  onSelectNode: (nodeId: string) => void
}) {
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  )
  const canvasHeight = useMemo(
    () =>
      Math.max(
        minCanvasHeight,
        ...graph.nodes.map((node) => node.position.y + nodeHeight + 40),
      ),
    [graph.nodes],
  )

  return (
    <section className="graph-workspace" aria-label="Project graph workspace">
      <div className="graph-canvas-panel">
        <div className="graph-canvas-meta">
          <div>
            <span>Canvas view</span>
            <strong>{graph.label}</strong>
          </div>
          <span>{Math.round(zoom * 100)}% zoom</span>
        </div>
        <section className="graph-canvas" aria-label="Project graph canvas">
          <div
            className="graph-canvas-zoom-frame"
            style={{
              height: canvasHeight * zoom,
              width: canvasWidth * zoom,
            }}
          >
            <div
              className="graph-canvas-inner"
              style={{
                height: canvasHeight,
                transform: `scale(${zoom})`,
                width: canvasWidth,
              }}
            >
              <svg
                aria-hidden="true"
                className="graph-edge-layer"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                {graph.edges.map((edge) => {
                  const source = nodeById.get(edge.source)
                  const target = nodeById.get(edge.target)

                  if (!source || !target) {
                    return null
                  }

                  const sourceX = source.position.x + nodeWidth / 2
                  const sourceY = source.position.y + nodeHeight / 2
                  const targetX = target.position.x + nodeWidth / 2
                  const targetY = target.position.y + nodeHeight / 2
                  const labelX = (sourceX + targetX) / 2
                  const labelY = (sourceY + targetY) / 2

                  return (
                    <g key={edge.id}>
                      <line
                        className={`graph-edge graph-edge--${edge.relationship}`}
                        x1={sourceX}
                        y1={sourceY}
                        x2={targetX}
                        y2={targetY}
                      />
                      <text className="graph-edge-label" x={labelX} y={labelY}>
                        {edge.label ?? relationshipLabel(edge)}
                      </text>
                    </g>
                  )
                })}
              </svg>
              {graph.nodes.map((node) => {
                const selected = node.id === selectedNodeId

                return (
                  <Link
                    key={node.id}
                    aria-current={selected ? 'true' : undefined}
                    className={[
                      'graph-node',
                      `graph-node--${node.type}`,
                      selected ? 'is-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onFocus={() => onSelectNode(node.id)}
                    onMouseEnter={() => onSelectNode(node.id)}
                    data-testid={`graph-node-${node.type}`}
                    data-entity-type={node.entityType}
                    data-entity-id={node.entityId}
                    style={{
                      left: node.position.x,
                      top: node.position.y,
                      width: nodeWidth,
                      minHeight: nodeHeight,
                    }}
                    to={node.sourcePath}
                  >
                    <span>{node.entityType}</span>
                    <strong>{node.label}</strong>
                    {node.subtitle ? <em>{node.subtitle}</em> : null}
                    <div className="graph-node-meta">
                      {node.status ? <StatusBadge status={node.status} /> : null}
                      {node.riskLevel ? (
                        <span
                          className={`graph-risk graph-risk--${node.riskLevel}`}
                        >
                          {node.riskLevel}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </div>
      <GraphInspectorPanel graph={graph} selectedNode={selectedNode} />
    </section>
  )
}

export function GraphInspectorPanel({
  graph,
  selectedNode,
}: {
  graph: NetworkGraph
  selectedNode: NetworkNode | null
}) {
  return (
    <aside
      className="graph-inspector"
      aria-label="Graph details and legend"
      data-testid="graph-inspector"
    >
      <section className="graph-inspector-card">
        <span>Selected record</span>
        {selectedNode ? (
          <>
            <h2>{selectedNode.label}</h2>
            <p>
              {selectedNode.subtitle ??
                `${labelFor(selectedNode.entityType)} source record`}
            </p>
            <dl className="graph-detail-list">
              <div>
                <dt>Type</dt>
                <dd>{labelFor(selectedNode.type)}</dd>
              </div>
              <div>
                <dt>Entity</dt>
                <dd>{selectedNode.entityType}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedNode.status ?? 'No status'}</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{selectedNode.riskLevel ?? 'low'}</dd>
              </div>
            </dl>
            <Link className="button button--secondary" to={selectedNode.sourcePath}>
              Open source record
            </Link>
          </>
        ) : (
          <p>No authorized node is selected in the current view.</p>
        )}
      </section>
      <GraphPermissionNote graph={graph} />
      <GraphLegend graph={graph} />
    </aside>
  )
}

function GraphPermissionNote({ graph }: { graph: NetworkGraph }) {
  const hiddenTotal =
    graph.visibility.hiddenNodeCount + graph.visibility.hiddenEdgeCount

  return (
    <section className="graph-inspector-card graph-permission-note">
      <span>Visibility rules</span>
      <h2>
        {graph.visibility.financeNodesIncluded
          ? 'Finance layer visible'
          : 'Finance layer hidden'}
      </h2>
      <p>
        This panel only describes nodes already authorized for the current role.
        {hiddenTotal > 0
          ? ` ${hiddenTotal} graph item${hiddenTotal === 1 ? '' : 's'} were removed by role permissions before rendering.`
          : ' No role-hidden graph items were returned to this view.'}
      </p>
    </section>
  )
}

export function GraphLegend({ graph }: { graph: NetworkGraph }) {
  const activeTypes = new Set(graph.nodes.map((node) => node.type))
  const activeRelationships = new Set(graph.edges.map((edge) => edge.relationship))

  return (
    <>
      <section className="graph-inspector-card">
        <span>Node legend</span>
        <div className="graph-legend-grid">
          {nodeLegend.map((item) => (
            <article
              className={activeTypes.has(item.type) ? '' : 'is-muted'}
              key={item.type}
            >
              <i className={`graph-node-swatch graph-node-swatch--${item.type}`} />
              <strong>{item.label}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="graph-inspector-card">
        <span>Relationship legend</span>
        <div className="graph-relationship-list">
          {relationshipLegend.map((item) => (
            <article
              className={
                activeRelationships.has(item.relationship) ? '' : 'is-muted'
              }
              key={item.relationship}
            >
              <i
                className={`graph-edge-swatch graph-edge-swatch--${item.relationship}`}
              />
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="graph-inspector-card">
        <span>Risk legend</span>
        <div className="graph-risk-legend">
          {riskOptions
            .filter((option): option is NetworkRiskLevel => option !== 'all')
            .map((risk) => (
              <span className={`graph-risk graph-risk--${risk}`} key={risk}>
                {risk}
              </span>
            ))}
        </div>
      </section>
    </>
  )
}

function emptyProjectGraph(): ProjectGraphApi {
  return {
    project: {
      id: '',
      name: '',
      status: '',
    },
    visibility: {
      roleCodes: [],
      financeNodesIncluded: false,
    },
    nodes: [],
    edges: [],
  }
}

function labelFor(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function relationshipLabel(edge: NetworkEdge) {
  return edge.relationship.replace('_', ' ')
}
