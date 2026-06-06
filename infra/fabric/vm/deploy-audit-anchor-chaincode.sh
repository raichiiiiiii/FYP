#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

require_command docker
require_command bash
require_command go
require_test_network
require_dir "$(chaincode_path)" "MEPN audit-anchor chaincode"

log "Deploying chaincode $FABRIC_CHAINCODE on channel $FABRIC_CHANNEL."
run_network_sh deployCC \
  -c "$FABRIC_CHANNEL" \
  -ccn "$FABRIC_CHAINCODE" \
  -ccp "$(chaincode_path)" \
  -ccl go

log "Chaincode deployment command completed."
