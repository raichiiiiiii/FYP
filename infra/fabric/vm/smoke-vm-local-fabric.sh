#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

require_command docker
require_command jq

log "Checking Fabric containers."
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'peer0\.org1\.example\.com|orderer\.example\.com|ca_org1' || {
  fail "Expected Fabric peer/orderer/CA containers are not running"
}

log "Checking Docker network $FABRIC_DOCKER_NETWORK."
docker network inspect "$FABRIC_DOCKER_NETWORK" >/dev/null

log "Validating Fabric secret layout without printing contents."
"$REPO_ROOT/scripts/validate-fabric-secrets.sh" "$FABRIC_SECRET_DIR"

log "Checking generated env does not use worker-container loopback."
if grep -Eq 'FABRIC_(PEER_ENDPOINT|GATEWAY_URL)=.*(127\.0\.0\.1|localhost)' "$FABRIC_SECRET_DIR/env.generated"; then
  fail "Generated Fabric endpoint uses loopback/localhost; worker containers cannot use that endpoint"
fi

log "Checking connection profile JSON."
jq -e '.peers and .channels' "$FABRIC_SECRET_DIR/connection-profile.json" >/dev/null

log "VM-local Fabric smoke checks passed."
