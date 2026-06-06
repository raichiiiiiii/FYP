#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

require_command docker
require_command bash
require_command go
require_test_network

if [[ "${FABRIC_SKIP_NETWORK_DOWN:-false}" == "true" ]]; then
  log "Skipping network down because FABRIC_SKIP_NETWORK_DOWN=true"
else
  log "Stopping any existing Fabric test-network containers for a clean start."
  run_network_sh down
fi

log "Starting Fabric test-network with CA and channel $FABRIC_CHANNEL."
run_network_sh up createChannel -ca -c "$FABRIC_CHANNEL"

log "Fabric test-network started."
log "Expected Docker network: $FABRIC_DOCKER_NETWORK"
log "Expected peer endpoint from app containers: $FABRIC_PEER_ENDPOINT"
