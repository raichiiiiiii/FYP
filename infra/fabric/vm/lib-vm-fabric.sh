#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

FABRIC_VM_ROOT="${FABRIC_VM_ROOT:-/opt/mepn-fabric}"
FABRIC_SAMPLES_DIR="${FABRIC_SAMPLES_DIR:-$FABRIC_VM_ROOT/fabric-samples}"
FABRIC_TEST_NETWORK_DIR="${FABRIC_TEST_NETWORK_DIR:-$FABRIC_SAMPLES_DIR/test-network}"
FABRIC_CHANNEL="${FABRIC_CHANNEL:-mepn-audit}"
FABRIC_CHAINCODE="${FABRIC_CHAINCODE:-audit-anchor}"
FABRIC_MSP_ID="${FABRIC_MSP_ID:-Org1MSP}"
FABRIC_IDENTITY="${FABRIC_IDENTITY:-appUser}"
FABRIC_PEER_ENDPOINT="${FABRIC_PEER_ENDPOINT:-peer0.org1.example.com:7051}"
FABRIC_GATEWAY_HOST_ALIAS="${FABRIC_GATEWAY_HOST_ALIAS:-peer0.org1.example.com}"
FABRIC_GATEWAY_URL="${FABRIC_GATEWAY_URL:-grpcs://$FABRIC_PEER_ENDPOINT}"
FABRIC_SECRET_DIR="${FABRIC_SECRET_DIR:-/run/secrets/fabric}"
FABRIC_DOCKER_NETWORK="${FABRIC_DOCKER_NETWORK:-fabric_test}"
FABRIC_VERSION="${FABRIC_VERSION:-2.5.15}"
FABRIC_CA_VERSION="${FABRIC_CA_VERSION:-1.5.17}"

log() {
  printf '[fabric-vm] %s\n' "$*"
}

warn() {
  printf '[fabric-vm] warning: %s\n' "$*" >&2
}

fail() {
  printf '[fabric-vm] error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

have_command() {
  command -v "$1" >/dev/null 2>&1
}

require_file() {
  local path="$1"
  local label="$2"
  [[ -s "$path" ]] || fail "$label is missing or empty: $path"
}

require_dir() {
  local path="$1"
  local label="$2"
  [[ -d "$path" ]] || fail "$label not found: $path"
}

require_test_network() {
  require_file "$FABRIC_TEST_NETWORK_DIR/network.sh" "Fabric test-network script"
}

chaincode_path() {
  printf '%s/chaincode/audit-anchor-go\n' "$REPO_ROOT"
}

org_root() {
  printf '%s/organizations/peerOrganizations/org1.example.com\n' "$FABRIC_TEST_NETWORK_DIR"
}

user_msp_dir() {
  printf '%s/users/User1@org1.example.com/msp\n' "$(org_root)"
}

peer_tls_dir() {
  printf '%s/peers/peer0.org1.example.com/tls\n' "$(org_root)"
}

find_user_private_key() {
  local key_dir
  key_dir="$(user_msp_dir)/keystore"
  require_dir "$key_dir" "Fabric user keystore"

  local key
  key="$(find "$key_dir" -maxdepth 1 -type f | head -n 1)"
  [[ -n "$key" ]] || fail "Fabric user private key not found in $key_dir"
  printf '%s\n' "$key"
}

require_fabric_material() {
  require_file "$(user_msp_dir)/signcerts/cert.pem" "Fabric user certificate"
  require_file "$(find_user_private_key)" "Fabric user private key"
  require_file "$(peer_tls_dir)/ca.crt" "Fabric peer TLS CA certificate"
}

docker_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    printf 'docker compose'
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    printf 'docker-compose'
    return
  fi

  fail "Docker Compose v2 plugin or docker-compose is required"
}

run_network_sh() {
  require_test_network
  (
    cd "$FABRIC_TEST_NETWORK_DIR"
    ./network.sh "$@"
  )
}

safe_file_status() {
  local path="$1"
  local label="$2"
  if [[ -s "$path" ]]; then
    local bytes
    bytes="$(wc -c <"$path" | tr -d ' ')"
    log "$label present (${bytes} bytes)"
  else
    fail "$label missing or empty: $path"
  fi
}
