import { describe, expect, it } from 'vitest'

import {
  filterNetworkGraphByView,
  filterNetworkGraphForRoles,
  mapProjectGraphApiToNetworkGraph,
  summarizeNetworkGraph,
} from './networkGraph.model'
import { projectGraphApiFixture } from './networkGraph.fixtures'

describe('network graph model', () => {
  it('maps backend project graph data into the Slice 9 network model', () => {
    const graph = mapProjectGraphApiToNetworkGraph(projectGraphApiFixture)

    expect(graph.nodes.map((node) => node.type)).toEqual([
      'organization',
      'buyer',
      'supplier',
      'document',
      'document',
      'opportunity',
      'application',
      'financier',
    ])
    expect(graph.edges.some((edge) => edge.relationship === 'finances')).toBe(true)
    expect(graph.nodes.find((node) => node.type === 'financier')?.label).toBe(
      'Financier review workspace',
    )
  })

  it('hides finance nodes and prunes finance edges for procurement users', () => {
    const graph = mapProjectGraphApiToNetworkGraph(projectGraphApiFixture)
    const visibleGraph = filterNetworkGraphForRoles(graph, [
      'PROCUREMENT_OFFICER',
    ])

    expect(visibleGraph.nodes.some((node) => node.type === 'opportunity')).toBe(false)
    expect(visibleGraph.nodes.some((node) => node.type === 'application')).toBe(false)
    expect(visibleGraph.nodes.some((node) => node.type === 'financier')).toBe(false)
    expect(
      visibleGraph.edges.every((edge) =>
        visibleGraph.nodes.some((node) => node.id === edge.source) &&
        visibleGraph.nodes.some((node) => node.id === edge.target),
      ),
    ).toBe(true)
    expect(visibleGraph.visibility.hiddenNodeCount).toBe(3)
  })

  it('shows finance nodes to financier users', () => {
    const graph = mapProjectGraphApiToNetworkGraph(projectGraphApiFixture)
    const visibleGraph = filterNetworkGraphForRoles(graph, ['FINANCIER_USER'])

    expect(visibleGraph.nodes.some((node) => node.type === 'opportunity')).toBe(true)
    expect(visibleGraph.nodes.some((node) => node.type === 'application')).toBe(true)
    expect(visibleGraph.nodes.some((node) => node.type === 'financier')).toBe(true)
    expect(visibleGraph.visibility.financeNodesIncluded).toBe(true)
  })

  it('supports canvas node type and risk filters without leaking hidden edges', () => {
    const graph = filterNetworkGraphForRoles(
      mapProjectGraphApiToNetworkGraph(projectGraphApiFixture),
      ['ORG_ADMIN'],
    )
    const applicationOnly = filterNetworkGraphByView(graph, {
      nodeType: 'application',
      riskLevel: 'medium',
    })

    expect(applicationOnly.nodes).toHaveLength(1)
    expect(applicationOnly.nodes[0].type).toBe('application')
    expect(applicationOnly.edges).toHaveLength(0)
  })

  it('summarizes risk and visibility for the canvas cockpit', () => {
    const graph = filterNetworkGraphForRoles(
      mapProjectGraphApiToNetworkGraph(projectGraphApiFixture),
      ['AUDITOR'],
    )
    const summary = summarizeNetworkGraph(graph)

    expect(summary.nodeCount).toBe(8)
    expect(summary.financeNodeCount).toBe(3)
    expect(summary.documentNodeCount).toBe(2)
    expect(summary.riskCounts.medium).toBeGreaterThan(0)
  })
})
