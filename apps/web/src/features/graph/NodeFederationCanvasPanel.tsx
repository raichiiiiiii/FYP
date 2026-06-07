import { useEffect, useMemo, useState } from 'react'

import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { AppSession, LoadState } from '../../shared/types'
import {
  useNodeFederationCanvas,
  type NodeFederationCanvas,
  type NodeFederationCanvasEdge,
  type NodeFederationCanvasNode,
} from './api/useNodeFederationCanvas'

export function NodeFederationCanvasPanel({
  session,
}: {
  session: AppSession
}) {
  const { getNodeFederationCanvas } = useNodeFederationCanvas(session)
  const [canvasState, setCanvasState] = useState<LoadState<NodeFederationCanvas>>(
    { status: 'loading' },
  )

  useEffect(() => {
    let cancelled = false

    getNodeFederationCanvas()
      .then((canvas) => {
        if (!cancelled) {
          setCanvasState({ status: 'ready', data: canvas })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCanvasState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load local federation canvas',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [getNodeFederationCanvas])

  if (canvasState.status === 'loading') {
    return <EmptyState>Loading local federation canvas...</EmptyState>
  }

  if (canvasState.status === 'error') {
    return <ErrorState message={canvasState.message} />
  }

  return <NodeFederationCanvasSummary canvas={canvasState.data} />
}

export function NodeFederationCanvasSummary({
  canvas,
}: {
  canvas: NodeFederationCanvas
}) {
  const summary = useMemo(() => summarizeCanvas(canvas), [canvas])
  const channels = canvas.nodes.filter(
    (node) => node.type === 'simulated_channel',
  )
  const organizationNodes = canvas.nodes.filter(
    (node) => node.type !== 'simulated_channel',
  )

  return (
    <section
      className="node-federation-panel"
      aria-label="Local node federation canvas"
    >
      <div className="node-federation-header">
        <div>
          <span>Local federation canvas</span>
          <h2>Self-hosted nodes and simulated channels</h2>
          <p>
            This panel is loaded from the node-federation API. It shows local
            peer/channel metadata only; it does not claim real Fabric topology
            mutation or real Fabric proof.
          </p>
        </div>
        <div className="node-federation-boundary">
          <strong>Simulated metadata only</strong>
          <span>Real Fabric proof still requires live ReadAnchor verification.</span>
        </div>
      </div>

      <div className="details-grid node-federation-metrics">
        <article>
          <span>Nodes</span>
          <strong>{summary.nodeCount}</strong>
        </article>
        <article>
          <span>Channels</span>
          <strong>{summary.channelCount}</strong>
        </article>
        <article>
          <span>Relationships</span>
          <strong>{summary.edgeCount}</strong>
        </article>
        <article>
          <span>Finance data edges</span>
          <strong>{summary.financeDataEdgeCount}</strong>
        </article>
      </div>

      {canvas.nodes.length ? (
        <div className="node-federation-layout">
          <section aria-label="Federation nodes">
            <h3>Organization nodes</h3>
            <div className="node-federation-list">
              {organizationNodes.map((node) => (
                <NodeFederationNodeCard key={node.id} node={node} />
              ))}
            </div>
          </section>
          <section aria-label="Simulated channels">
            <h3>Simulated channels</h3>
            <div className="node-federation-list">
              {channels.map((channel) => (
                <NodeFederationNodeCard key={channel.id} node={channel} />
              ))}
            </div>
          </section>
          <section aria-label="Federation relationships">
            <h3>Channel relationships</h3>
            <div className="node-federation-edge-list">
              {canvas.edges.map((edge) => (
                <NodeFederationEdgeRow
                  edge={edge}
                  key={edge.id}
                  nodes={canvas.nodes}
                />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <EmptyState>
          No local federation metadata is available for this node yet.
        </EmptyState>
      )}
    </section>
  )
}

function NodeFederationNodeCard({ node }: { node: NodeFederationCanvasNode }) {
  return (
    <article className={`node-federation-card node-federation-card--${node.type}`}>
      <span>{labelFor(node.type)}</span>
      <strong>{node.label}</strong>
      <div className="node-federation-card-meta">
        <StatusBadge status={node.status} />
        {node.nodeType ? <em>{labelFor(node.nodeType)}</em> : null}
        {node.channelType ? <em>{labelFor(node.channelType)}</em> : null}
      </div>
    </article>
  )
}

function NodeFederationEdgeRow({
  edge,
  nodes,
}: {
  edge: NodeFederationCanvasEdge
  nodes: NodeFederationCanvasNode[]
}) {
  const source = nodes.find((node) => node.id === edge.source)
  const target = nodes.find((node) => node.id === edge.target)

  return (
    <article className={`node-federation-edge node-federation-edge--${edge.type}`}>
      <span>{labelFor(edge.type)}</span>
      <strong>
        {source?.label ?? edge.source}
        {' to '}
        {target?.label ?? edge.target}
      </strong>
      <em>{edge.label}</em>
    </article>
  )
}

function summarizeCanvas(canvas: NodeFederationCanvas) {
  return {
    nodeCount: canvas.nodes.filter((node) => node.type !== 'simulated_channel')
      .length,
    channelCount: canvas.nodes.filter(
      (node) => node.type === 'simulated_channel',
    ).length,
    edgeCount: canvas.edges.length,
    financeDataEdgeCount: canvas.edges.filter(
      (edge) => edge.type === 'shares_finance_data_on',
    ).length,
  }
}

function labelFor(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}
