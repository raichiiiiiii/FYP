#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

require_command docker
require_command bash
require_test_network

log "Stopping Fabric test-network."
run_network_sh down
log "Fabric test-network stopped."
