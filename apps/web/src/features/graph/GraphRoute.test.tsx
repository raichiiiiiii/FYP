import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { GraphInspectorPanel, GraphLegend } from './GraphRoute'
import {
  filterNetworkGraphForRoles,
  mapProjectGraphApiToNetworkGraph,
} from './model/networkGraph.model'
import { projectGraphApiFixture } from './model/networkGraph.fixtures'

describe('network graph UI', () => {
  it('explains permission-filtered graph visibility without exposing finance record labels', () => {
    const graph = filterNetworkGraphForRoles(
      mapProjectGraphApiToNetworkGraph(projectGraphApiFixture),
      ['PROCUREMENT_OFFICER'],
    )
    const selectedNode = graph.nodes.find((node) => node.type === 'document') ?? graph.nodes[0]
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GraphInspectorPanel graph={graph} selectedNode={selectedNode} />
      </MemoryRouter>,
    )

    expect(html).toContain('Finance layer hidden')
    expect(html).toContain('role permissions')
    expect(html).toContain('Open source record')
    expect(html).not.toContain('Solar panel working capital')
    expect(html).not.toContain('Application app-fixture')
  })

  it('renders node, relationship, and risk legends for reviewer context', () => {
    const graph = filterNetworkGraphForRoles(
      mapProjectGraphApiToNetworkGraph(projectGraphApiFixture),
      ['ORG_ADMIN'],
    )
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GraphLegend graph={graph} />
      </MemoryRouter>,
    )

    expect(html).toContain('Node legend')
    expect(html).toContain('Relationship legend')
    expect(html).toContain('Risk legend')
    expect(html).toContain('Restricted mudarabah finance relation')
    expect(html).toContain('Revenue-generating finance opportunity')
  })
})
