#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

missing=0

check_command() {
  local name="$1"
  if have_command "$name"; then
    log "$name: available"
  else
    warn "$name: missing"
    missing=1
  fi
}

check_command docker
check_command git
check_command bash
check_command curl
check_command jq
check_command go

if docker compose version >/dev/null 2>&1; then
  log "docker compose: available"
elif command -v docker-compose >/dev/null 2>&1; then
  log "docker-compose: available"
else
  warn "Docker Compose: missing"
  missing=1
fi

if [[ -f "$FABRIC_TEST_NETWORK_DIR/network.sh" ]]; then
  log "Fabric samples test-network: available at $FABRIC_TEST_NETWORK_DIR"
else
  warn "Fabric samples test-network: missing at $FABRIC_TEST_NETWORK_DIR"
  missing=1
fi

if [[ -d "$(chaincode_path)" ]]; then
  log "MEPN audit-anchor chaincode: available"
else
  warn "MEPN audit-anchor chaincode: missing at $(chaincode_path)"
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  fail "Missing VM Fabric prerequisites. Run install-vm-fabric-prereqs.sh where appropriate."
fi

log "VM Fabric prerequisites are present."
