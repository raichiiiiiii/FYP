# Node Network Graph Implementation Plan

Status: planned  
Scope: create the node-first network graph envisioned for local self-hosted MEPN nodes.  
Boundary: the current project-scoped graph remains useful but should be renamed and separated from the node-network view.

## 1. Problem statement

The current graph feature does not match the intended visual model.

The intended model is:

- companies run as local/self-hosted nodes at addresses such as `XXX-1`, `XXX-2`, `XXX-3`, `XXX-4`, `XXX-5`, `XXX-6`, and `XXX-7`;
- each company node can connect to another company node through a Fabric or simulated Fabric channel;
- a channel can be private 1-to-1 or 1-to-many;
- a 1-to-many channel can represent tender announcement and supplier contesting;
- the graph should show vectors/edges for ongoing business deals between nodes;
- clicking a node, channel, or vector should explain the company, channel membership, and active deal context.

The current implementation still feels project-first because the current page loads projects and then shows a project/procurement/evidence graph. That feature should be retained but renamed to match its purpose.

## 2. Current implementation assessment

### 2.1 Current project graph

Current graph route:

```text
/graph/projects
```

Current backend API:

```http
GET /api/v1/graph/projects/:projectId
```

Current frontend hook:

```text
apps/web/src/features/graph/api/useProjectGraph.ts
```

Current backend files:

```text
apps/api/src/modules/graph/graph.controller.ts
apps/api/src/modules/graph/graph.service.ts
```

Current purpose:

```text
Project-level procurement, finance, evidence, hash, and anchor relationship map.
```

Current node types include:

```text
organization
supplier
buyer
opportunity
application
document
hash_record
anchor
financier
```

Current edge types include:

```text
supplies
buys_from
finances
evidences
verifies
anchors
supports
```

Assessment:

This graph is useful, but it is not the local-node/Fabric-channel network graph. It is a project evidence/context graph. It should not keep the generic left-panel name `Network Canvas` because that name now conflicts with the intended node-network feature.

Recommended rename:

```text
Current "Network Canvas" -> "Project Evidence Graph"
```

Alternative acceptable names:

```text
Project Context Graph
Procurement Evidence Graph
```

Preferred name:

```text
Project Evidence Graph
```

### 2.2 Current node federation feature

Current node-federation backend files:

```text
apps/api/src/modules/node-federation/node-federation.controller.ts
apps/api/src/modules/node-federation/node-federation.service.ts
apps/api/src/modules/node-federation/node-federation.dto.ts
```

Current node-federation frontend files:

```text
apps/web/src/features/graph/NodeFederationCanvasPanel.tsx
apps/web/src/features/graph/api/useNodeFederationCanvas.ts
```

Current node-federation API surface includes:

```http
GET  /api/v1/node-federation/status
GET  /api/v1/node-federation/peers
POST /api/v1/node-federation/peers
POST /api/v1/node-federation/peers/:peerId/ping
GET  /api/v1/node-federation/channels
POST /api/v1/node-federation/channels
POST /api/v1/node-federation/channels/:channelId/invite
POST /api/v1/node-federation/invitations/:invitationId/accept
POST /api/v1/node-federation/events
GET  /api/v1/node-federation/canvas
```

Current node-federation model includes:

```text
NodeDeployment
NodePeer
NodeChannel
NodeChannelMembership
OutboundNodeEvent
InboundNodeEvent
```

Current node-federation graph types include:

```text
node_deployment
peer_node
simulated_channel
```

Current node-federation edge types include:

```text
hosts
peers_with
participates_in_channel
shares_finance_data_on
private_channel
```

Assessment:

This is closer to the intended feature, but it is currently embedded as a panel inside the project graph page. It renders summary cards and relationship rows, not the expected node/channel/vector visual canvas.

It should become its own first-class page.

## 3. Product decision

Split the graph feature into two left-panel items.

| Sidebar item | Route | Purpose |
|---|---|---|
| `Node Network` | `/network/nodes` | Shows local node, peer nodes, Fabric/simulated channels, and business deal vectors. |
| `Project Evidence Graph` | `/graph/projects` | Shows project-scoped procurement, finance, evidence, hash, and anchor relationships. |

Do not force the project graph to become the node network graph. They answer different questions.

## 4. Target Node Network concept

The new Node Network page should answer:

```text
Which local company node is connected to which peer node, through which channel, and what business deal is currently flowing through that connection?
```

Target visual model:

```text
Company Node XXX-1
  -- participates in --> tender-market-channel
  -- announces tender --> Ramadan stock tender

Supplier Node XXX-2
  -- bids on --> tender-market-channel
  -- contesting --> Ramadan stock tender

Supplier Node XXX-3
  -- bids on --> tender-market-channel
  -- contesting --> Ramadan stock tender

Company Node XXX-1
  -- private award channel --> award-xxx1-xxx2-channel
  -- awarded contract --> Supplier Node XXX-2

Finance Node XXX-8
  -- finances/backups --> Supplier Node XXX-2
  -- shares data on --> finance-data-channel
```

The channel should be visible as a node between organizations, not only as a text list.

The ongoing business deal should be visible as a directed vector/edge, not only as hidden metadata.

## 5. Required data-model change

Keep the current node-federation tables:

```text
NodeDeployment
NodePeer
NodeChannel
NodeChannelMembership
OutboundNodeEvent
InboundNodeEvent
```

Add a first-class business vector model.

Recommended MVP model:

```text
NodeBusinessVector
  id
  localNodeId
  channelId
  sourceNodeKey
  targetNodeKey
  targetChannelName
  vectorType
  businessEntityType
  businessEntityId
  label
  status
  amount
  currency
  metadata
  createdAt
  updatedAt
```

Recommended vector types:

```text
announces_tender
submits_bid
contests_contract
shortlisted_for
awarded_contract
private_deal
supplies_to
finances
backs_finance
shares_finance_data
delivers_to
pays_to
```

Minimum status values:

```text
open
contesting
shortlisted
awarded
active
monitoring
completed
cancelled
blocked
```

Why this matters:

`NodeChannelMembership` can show that nodes are members of a channel. It cannot clearly show what business is happening through that channel. `NodeBusinessVector` provides the missing deal layer.

## 6. Required API change

Add a dedicated node-network canvas endpoint instead of relying only on the project graph endpoint.

Recommended API:

```http
GET /api/v1/node-network/canvas
```

Alternative acceptable API:

```http
GET /api/v1/node-federation/canvas?includeBusinessVectors=true
```

Preferred API:

```http
GET /api/v1/node-network/canvas
```

Expected response shape:

```json
{
  "nodes": [
    {
      "id": "node:xxx-1",
      "type": "local_node",
      "label": "Amanah Retail",
      "nodeKey": "xxx-1",
      "ipAddress": "XXX-1",
      "apiUrl": "http://XXX-1:3000",
      "webUrl": "http://XXX-1:5173",
      "organizationType": "BUSINESS_BUYER_SUPPLIER",
      "status": "online"
    },
    {
      "id": "channel:tender-market-channel",
      "type": "tender_channel",
      "label": "Tender Market Channel",
      "status": "simulated_active",
      "memberNodeKeys": ["xxx-1", "xxx-2", "xxx-3"]
    }
  ],
  "edges": [
    {
      "id": "vector:xxx-1:tender-market-channel:ramadan-stock",
      "source": "node:xxx-1",
      "target": "channel:tender-market-channel",
      "type": "announces_tender",
      "label": "Ramadan stock tender",
      "businessStatus": "open"
    },
    {
      "id": "vector:xxx-2:tender-market-channel:ramadan-stock",
      "source": "node:xxx-2",
      "target": "channel:tender-market-channel",
      "type": "submits_bid",
      "label": "Barakah bid submitted",
      "businessStatus": "contesting"
    }
  ]
}
```

The API should include node positions or enough type information for deterministic frontend layout.

## 7. Required frontend change

Create a new route/page:

```text
apps/web/src/features/network/NodeNetworkRoute.tsx
```

Add hook:

```text
apps/web/src/features/network/api/useNodeNetworkCanvas.ts
```

Add model files:

```text
apps/web/src/features/network/model/nodeNetwork.types.ts
apps/web/src/features/network/model/nodeNetwork.layout.ts
```

Add route:

```text
/network/nodes
```

Add sidebar item:

```text
Network -> Node Network
```

Rename existing graph sidebar item:

```text
Graph/Canvas -> Project Evidence Graph
```

The `NodeFederationCanvasPanel` should either be migrated into `NodeNetworkRoute` or retired after the new canvas exists.

## 8. Required visualization behavior

Node Network page should render:

- company nodes as large cards/circles;
- channels as connector nodes between companies;
- deal vectors as directed arrows;
- channel membership as light edges;
- business deal vectors as stronger labelled edges;
- finance data channel as a separate finance cluster;
- private 1-to-1 channels as direct connector nodes between two companies;
- tender 1-to-many channel as a hub with many supplier nodes around it.

Filters:

- channel type;
- node type;
- deal status;
- vector type;
- show/hide finance channels;
- show/hide completed deals;
- show only local node connections.

Inspector panel:

- click node -> organization/node/IP/API/status;
- click channel -> channel type, members, status, simulated/real boundary;
- click vector -> business deal, tender, bid, award, financing, status, amount, linked source records.

## 9. Required naming changes

Rename current labels:

```text
Network Canvas -> Project Evidence Graph
Project network canvas -> Project evidence graph
Project, procurement, finance, and evidence context -> Project procurement, finance, evidence, hash, and proof context
```

Add new labels:

```text
Node Network
Local node network
Company nodes, channels, and active deal vectors
```

## 10. Required seed/demo data

Seed node network data representing:

1. Seven business nodes:
   - `XXX-1` Amanah Retail
   - `XXX-2` Barakah Supplies
   - `XXX-3` Ihsan Foods
   - `XXX-4` Nur Logistics
   - `XXX-5` Salsabil Packaging
   - `XXX-6` Taqwa Office
   - `XXX-7` Hikmah Health

2. Three finance nodes:
   - `XXX-8` Mabrur Finance
   - `XXX-9` Aman Capital
   - `XXX-10` Safwa Growth

3. Channels:
   - `tender-market-channel`
   - `award-xxx1-xxx2-channel`
   - `award-xxx1-xxx3-channel`
   - `finance-data-channel`
   - `finance-xxx8-xxx2-channel`

4. Business vectors:
   - `XXX-1 announces tender on tender-market-channel`
   - `XXX-2 submits bid on tender-market-channel`
   - `XXX-3 submits bid on tender-market-channel`
   - `XXX-1 awards contract to XXX-2 through award-xxx1-xxx2-channel`
   - `XXX-8 finances/backs XXX-2 through finance-xxx8-xxx2-channel`
   - `XXX-8 shares finance data on finance-data-channel`
   - `XXX-9 shares finance data on finance-data-channel`
   - `XXX-10 shares finance data on finance-data-channel`

## 11. Validation requirements

Automated validation should prove:

- `Project Evidence Graph` still loads project-level graph records.
- `Node Network` loads without requiring a selected project.
- `Node Network` displays at least 7 business nodes and 3 finance nodes in seeded demo.
- `Node Network` displays tender channel with 1-to-many membership.
- `Node Network` displays private award channel with 1-to-1 membership.
- `Node Network` displays finance data channel only for finance-data relationships.
- `Node Network` displays business vectors with labels and statuses.
- Clicking a node shows node detail.
- Clicking a channel shows channel detail.
- Clicking a vector shows active deal detail.
- Simulated channel labels do not claim real Fabric proof.

## 12. Screenshot evidence

Capture screenshots into:

```text
docs/evidence/uat/screenshots/node-network/
```

Minimum screenshots:

- `01-node-network-overview.png`
- `02-tender-market-channel.png`
- `03-private-award-channel.png`
- `04-finance-data-channel.png`
- `05-business-vector-inspector.png`
- `06-project-evidence-graph-renamed.png`

## 13. Acceptance criteria

1. A new left-panel item named `Node Network` exists.
2. The new `Node Network` page does not require selecting a project.
3. The new graph shows local node and peer nodes by node/IP identity.
4. The new graph shows channels as first-class connector nodes.
5. The new graph shows 1-to-1 private channels.
6. The new graph shows 1-to-many tender channels.
7. The new graph shows active business-deal vectors between nodes and/or channels.
8. The current project graph is renamed to `Project Evidence Graph`.
9. Current project graph behavior remains available.
10. Node-network API returns nodes, channels, and vector edges.
11. Seed data includes business node, finance node, channel, and business vector examples.
12. Screenshots are generated for reviewer evidence.
13. Tests pass for graph route rename and node network rendering.
14. Simulated network data is clearly labelled as simulated/local, not real Fabric topology proof.

## 14. Non-goals

Do not implement in this slice:

- real Fabric channel creation;
- real MSP enrollment;
- real orderer administration;
- production node-federation security;
- real payment settlement;
- replacement of the Project Evidence Graph.

The goal is to add the missing node-first graph, not to remove the existing project graph.
