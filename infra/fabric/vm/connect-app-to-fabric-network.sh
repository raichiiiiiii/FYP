#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

MEPN_API_CONTAINER="${MEPN_API_CONTAINER:-mepn_api}"
MEPN_WORKER_CONTAINER="${MEPN_WORKER_CONTAINER:-mepn_worker}"

require_command docker

container_exists() {
  docker inspect "$1" >/dev/null 2>&1
}

container_on_network() {
  local container="$1"
  docker inspect -f '{{json .NetworkSettings.Networks}}' "$container" |
    grep -q "\"$FABRIC_DOCKER_NETWORK\""
}

connect_container() {
  local container="$1"

  if ! container_exists "$container"; then
    fail "Container not found: $container"
  fi

  if container_on_network "$container"; then
    log "$container is already connected to $FABRIC_DOCKER_NETWORK"
    return
  fi

  log "Connecting $container to Docker network $FABRIC_DOCKER_NETWORK"
  docker network connect "$FABRIC_DOCKER_NETWORK" "$container"
}

docker network inspect "$FABRIC_DOCKER_NETWORK" >/dev/null ||
  fail "Fabric Docker network not found: $FABRIC_DOCKER_NETWORK"

connect_container "$MEPN_API_CONTAINER"
connect_container "$MEPN_WORKER_CONTAINER"

log "Checking peer alias resolution from worker container."
if docker exec "$MEPN_WORKER_CONTAINER" sh -lc "command -v getent >/dev/null 2>&1"; then
  docker exec "$MEPN_WORKER_CONTAINER" sh -lc "getent hosts '$FABRIC_GATEWAY_HOST_ALIAS' >/dev/null"
  log "Worker can resolve $FABRIC_GATEWAY_HOST_ALIAS"
else
  warn "getent is not available in $MEPN_WORKER_CONTAINER; DNS resolution check skipped"
fi

if docker exec "$MEPN_WORKER_CONTAINER" sh -lc "command -v nc >/dev/null 2>&1"; then
  docker exec "$MEPN_WORKER_CONTAINER" sh -lc "nc -vz '$FABRIC_GATEWAY_HOST_ALIAS' 7051 >/dev/null 2>&1"
  log "Worker can reach $FABRIC_GATEWAY_HOST_ALIAS:7051"
else
  warn "nc is not available in $MEPN_WORKER_CONTAINER; TCP reachability check skipped"
fi

log "App containers are connected to the VM-local Fabric network."
