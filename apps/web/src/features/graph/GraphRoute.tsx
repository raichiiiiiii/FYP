import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '../../layouts/PageHeader'
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
  NetworkNodeType,
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

const nodeTypeOptions: Array<NetworkNodeType | 'all'> = [
  'all',
  'organization',
  'supplier',
  'buyer',
  'financier',
  'opportunity',
  'application',
  'document',
]

const riskOptions: Array<NetworkRiskLevel | 'all'> = [
  'all',
  'low',
  'medium',
  'high',
  'critical',
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

  return (
    <>
      <PageHeader eyebrow="Graph/Canvas" title="Project network canvas" />
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
        <label className="graph-toggle">
          <input
            type="checkbox"
            checked={showFinance}
            onChange={(event) => setShowFinance(event.target.checked)}
          />
          <span>Show finance layer</span>
        </label>
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
      {graph && graph.nodes.length ? <GraphCanvas graph={graph} /> : null}
      {graph && !graph.nodes.length ? (
        <EmptyState>
          No authorized graph records match the current filters.
        </EmptyState>
      ) : null}
    </>
  )
}

function GraphCanvas({ graph }: { graph: NetworkGraph }) {
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
    <section className="graph-canvas" aria-label="Project graph canvas">
      <div
        className="graph-canvas-inner"
        style={{ height: canvasHeight, width: canvasWidth }}
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
        {graph.nodes.map((node) => (
          <Link
            key={node.id}
            className={`graph-node graph-node--${node.type}`}
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
                <span className={`graph-risk graph-risk--${node.riskLevel}`}>
                  {node.riskLevel}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
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
