import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '../../layouts/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppSession } from '../../shared/types'
import { useProjects } from '../procurement/api/useProjects'
import { useProjectGraph } from './api/useProjectGraph'

type Project = {
  id: string
  name: string
  code?: string | null
  status: string
}

type GraphNode = {
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

type GraphEdge = {
  id: string
  sourceNodeId: string
  targetNodeId: string
  label: string
}

type ProjectGraph = {
  project: {
    id: string
    name: string
    status: string
  }
  visibility: {
    roleCodes: string[]
    financeNodesIncluded: boolean
  }
  nodes: GraphNode[]
  edges: GraphEdge[]
}

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

const nodeWidth = 172
const nodeHeight = 74
const minCanvasHeight = 720
const canvasWidth = 1040

export function GraphRoute({ session }: { session: AppSession }) {
  const { listProjects } = useProjects(session)
  const { getProjectGraph } = useProjectGraph(session)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [graphState, setGraphState] = useState<LoadState<ProjectGraph>>({
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
          setGraphState({ status: 'ready', data: emptyGraph() })
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

        return getProjectGraph<ProjectGraph>(projectId)
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

  const graph = graphState.status === 'ready' ? graphState.data : null

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
        {graph ? (
          <div className="details-grid graph-summary">
            <article>
              <span>Nodes</span>
              <strong>{graph.nodes.length}</strong>
            </article>
            <article>
              <span>Edges</span>
              <strong>{graph.edges.length}</strong>
            </article>
            <article>
              <span>Finance layer</span>
              <strong>{graph.visibility.financeNodesIncluded ? 'Visible' : 'Hidden'}</strong>
            </article>
          </div>
        ) : null}
      </section>

      {graphState.status === 'loading' ? (
        <EmptyState>Loading project graph...</EmptyState>
      ) : null}
      {graphState.status === 'error' ? (
        <p className="error-text">{graphState.message}</p>
      ) : null}
      {graph && graph.nodes.length ? <GraphCanvas graph={graph} /> : null}
      {graph && !graph.nodes.length ? (
        <EmptyState>No project graph records found.</EmptyState>
      ) : null}
    </>
  )
}

function GraphCanvas({ graph }: { graph: ProjectGraph }) {
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
            const source = nodeById.get(edge.sourceNodeId)
            const target = nodeById.get(edge.targetNodeId)

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
                  className="graph-edge"
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                />
                <text className="graph-edge-label" x={labelX} y={labelY}>
                  {edge.label}
                </text>
              </g>
            )
          })}
        </svg>
        {graph.nodes.map((node) => (
          <Link
            key={node.id}
            className={`graph-node graph-node--${node.category}`}
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
            {node.status ? <StatusBadge status={node.status} /> : null}
          </Link>
        ))}
      </div>
    </section>
  )
}

function emptyGraph(): ProjectGraph {
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
