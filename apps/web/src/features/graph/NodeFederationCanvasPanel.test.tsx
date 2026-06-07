import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NodeFederationCanvasSummary } from './NodeFederationCanvasPanel'
import type { NodeFederationCanvas } from './api/useNodeFederationCanvas'

describe('NodeFederationCanvasSummary', () => {
  it('renders API-backed node/channel metadata without claiming real Fabric proof', () => {
    const html = renderToStaticMarkup(
      <NodeFederationCanvasSummary canvas={canvasFixture} />,
    )

    expect(html).toContain('Local federation canvas')
    expect(html).toContain('Amanah Retail Sdn Bhd')
    expect(html).toContain('tender-market-channel')
    expect(html).toContain('finance-data-channel')
    expect(html).toContain('Shares Finance Data On')
    expect(html).toContain('Simulated metadata only')
    expect(html).toContain('ReadAnchor verification')
    expect(html).not.toContain('verified=true')
    expect(html).not.toContain('private key material')
  })
})

const canvasFixture: NodeFederationCanvas = {
  nodes: [
    {
      id: 'node:amanah-retail',
      type: 'node_deployment',
      label: 'Amanah Retail Sdn Bhd',
      status: 'local',
      nodeKey: 'amanah-retail',
      nodeType: 'BUSINESS_BUYER_SUPPLIER',
    },
    {
      id: 'node:barakah-supplies',
      type: 'peer_node',
      label: 'Barakah Supplies Sdn Bhd',
      status: 'reachable',
      nodeKey: 'barakah-supplies',
      nodeType: 'BUSINESS_SUPPLIER_MUDARIB',
    },
    {
      id: 'channel:tender-market-channel',
      type: 'simulated_channel',
      label: 'tender-market-channel',
      status: 'simulated_active',
      channelType: 'SHARED_TENDER_COMPETITION',
    },
    {
      id: 'channel:finance-data-channel',
      type: 'simulated_channel',
      label: 'finance-data-channel',
      status: 'simulated_active',
      channelType: 'FINANCE_ENTITY_DATA_SHARING',
    },
  ],
  edges: [
    {
      id: 'peer:amanah-retail:barakah-supplies',
      source: 'node:amanah-retail',
      target: 'node:barakah-supplies',
      type: 'peers_with',
      label: 'peers with',
    },
    {
      id: 'membership:tender-market-channel:amanah-retail',
      source: 'node:amanah-retail',
      target: 'channel:tender-market-channel',
      type: 'participates_in_channel',
      label: 'simulated_joined',
    },
    {
      id: 'membership:finance-data-channel:mabrur-finance',
      source: 'node:mabrur-finance',
      target: 'channel:finance-data-channel',
      type: 'shares_finance_data_on',
      label: 'simulated_joined',
    },
  ],
}
