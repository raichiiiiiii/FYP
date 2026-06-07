# Multi-Node Federation Blockers

Last updated: 2026-06-07

## Active Blockers

None for the isolated node seed slice.

## Open Implementation Items

These are not blockers for the current slice, but remain required for the full
multi-node federation objective:

- 10-node Docker Compose topology.
- Per-node `.env.nodes/*.env` files.
- Root `start.ps1` reset/rebuild/reseed workflow for all nodes.
- Node-to-node federation APIs and shared-secret local transport.
- Preconfigured simulated tender, award/deal, finance-data, and finance-support
  channels.
- Graph/canvas node/channel rendering.
- Organization admin role-assignment hardening.
- Sidebar visibility override APIs/UI.
- Account password update API/UI.
- Multi-node E2E/UAT screenshots from every relevant local port.

## Boundary Notes

- Simulated federation does not create real Fabric channels.
- Simulated channel membership does not prove real MSP onboarding.
- Seeded or simulated hash metadata must not be marked as real Fabric proof.
- Real proof remains gated by live Fabric Gateway `ReadAnchor` verification.
