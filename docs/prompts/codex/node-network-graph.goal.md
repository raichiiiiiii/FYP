# Codex Goal: Node Network Graph

Use this prompt with Codex `/goal` for the node-network graph work. `/goal` is appropriate because this is a long-running implementation task with clear validation criteria and a repeatable fix-and-test loop.

```text
/goal Implement the MEPN Node Network graph without stopping until the local/UAT graph shows self-hosted company nodes, Fabric/simulated channels, and active business-deal vectors, while preserving the existing project evidence graph.

Context:
- The current graph route is project-scoped and should be renamed to Project Evidence Graph.
- The current project graph loads from GET /api/v1/graph/projects/:projectId and requires selecting a project.
- The intended Node Network must not require project selection.
- The intended Node Network must show local company nodes running at local/IP identities such as XXX-1 through XXX-7, plus finance nodes.
- A company may establish a connection with another company through a Fabric or simulated Fabric channel.
- A channel may be private 1-to-1 or 1-to-many.
- A 1-to-many channel should support tender announcement and suppliers contesting the contract.
- Directed vectors should show current ongoing business deals between nodes and/or channels.

Required product change:
1. Add a new left-panel route named Node Network.
2. Rename the current Network Canvas / Project network canvas to Project Evidence Graph.
3. Keep the current project graph behavior available and working.
4. Move or reuse the current NodeFederationCanvasPanel logic as the basis for the new Node Network page.
5. Implement a real visual node/channel/vector canvas, not only summary cards and relationship rows.

Backend requirements:
1. Keep existing node-federation APIs and data model where useful.
2. Add a business-vector layer so the graph can show active business relationships, not only channel membership.
3. Add or extend API so the frontend can call a node-first endpoint such as GET /api/v1/node-network/canvas.
4. Response must include nodes, channels, and directed vector edges.
5. Simulated/local channel data must be labelled as simulated and must not claim real Fabric topology mutation or verified Fabric proof.

Recommended data model:
- Add NodeBusinessVector or equivalent.
- Fields should capture localNodeId, channelId, sourceNodeKey, targetNodeKey, targetChannelName, vectorType, businessEntityType, businessEntityId, label, status, amount, currency, metadata, createdAt, and updatedAt.

Required vector types:
- announces_tender
- submits_bid
- contests_contract
- shortlisted_for
- awarded_contract
- private_deal
- supplies_to
- finances
- backs_finance
- shares_finance_data
- delivers_to
- pays_to

Frontend requirements:
1. Create NodeNetworkRoute or equivalent.
2. Add route /network/nodes.
3. Add sidebar item Node Network.
4. Rename existing graph sidebar label to Project Evidence Graph.
5. Render company nodes, finance nodes, channels, and business vectors on a canvas.
6. Render channels as first-class connector nodes.
7. Render deal vectors as directed labelled arrows.
8. Add inspector behavior:
   - click node -> organization/node/IP/API/status
   - click channel -> channel type, members, status, simulated/real boundary
   - click vector -> active business deal/tender/bid/award/finance details
9. Add filters for channel type, node type, deal status, vector type, finance layer, completed deals, and local-node-only view.

Seed/demo requirements:
Seed enough data to show:
- Seven business nodes: XXX-1 through XXX-7.
- Three finance nodes: XXX-8 through XXX-10.
- tender-market-channel as 1-to-many tender channel.
- at least one 1-to-1 private award channel.
- finance-data-channel among finance entities.
- at least one finance backup/support channel.
- active business vectors for tender announcement, supplier bid, contract award, and finance backing.

Validation loop:
1. Read existing GraphRoute, networkGraph model/types, GraphService, GraphController, NodeFederationCanvasPanel, node-federation controller/service/dto, Prisma schema, and related tests.
2. Summarize current implementation before editing.
3. Implement in vertical slices.
4. Run relevant unit, integration, e2e, typecheck, and build validation.
5. Capture screenshots for Node Network and Project Evidence Graph.
6. Record blockers in docs/evidence/uat or a node-network blocker file.
7. Fix blockers within MVP scope.
8. Repeat until acceptance criteria pass.

Acceptance criteria:
1. New left-panel item Node Network exists.
2. New Node Network page does not require project selection.
3. Existing project graph is renamed to Project Evidence Graph.
4. Existing project graph still works.
5. Node Network shows local node and peer nodes by node/IP identity.
6. Node Network shows channels as first-class connector nodes.
7. Node Network shows 1-to-1 private channels.
8. Node Network shows 1-to-many tender channels.
9. Node Network shows active business-deal vectors between nodes and/or channels.
10. Business vectors have labels and statuses.
11. Clicking node/channel/vector opens relevant inspector detail.
12. Simulated/local channel data is labelled as simulated and not real Fabric proof.
13. Tests cover route rename and Node Network rendering.
14. Screenshot evidence is saved under docs/evidence/uat/screenshots/node-network/.

Non-goals:
- Do not implement real Fabric channel creation in this slice.
- Do not implement real MSP enrollment.
- Do not implement orderer administration.
- Do not implement production node-federation security.
- Do not remove the existing project graph.
```
