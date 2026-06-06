#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/check-vm-fabric-prereqs.sh"
bash "$SCRIPT_DIR/start-vm-local-fabric.sh"
bash "$SCRIPT_DIR/deploy-audit-anchor-chaincode.sh"
bash "$SCRIPT_DIR/export-app-fabric-secrets.sh"

log() {
  printf '[fabric-vm] %s\n' "$*"
}

log "VM-local Fabric runtime bootstrap completed."
log "Next: restart the MEPN app stack with /run/secrets/fabric/env.generated."
