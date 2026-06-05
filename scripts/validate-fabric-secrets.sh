#!/usr/bin/env bash
set -euo pipefail

secret_root="${1:-${FABRIC_SECRET_DIR:-/run/secrets/fabric}}"

fail() {
  echo "Fabric secret validation failed: $1" >&2
  exit 1
}

check_file() {
  local path="$1"
  local label="$2"

  [ -f "${path}" ] || fail "${label} is missing"
  [ -s "${path}" ] || fail "${label} is empty"
}

check_file "${secret_root}/identity/cert.pem" "identity certificate"
check_file "${secret_root}/identity/key.pem" "private key"
check_file "${secret_root}/tls/ca.crt" "TLS CA certificate"
check_file "${secret_root}/connection-profile.json" "connection profile"
check_file "${secret_root}/env.generated" "generated Fabric env file"

python3 -m json.tool "${secret_root}/connection-profile.json" >/dev/null ||
  fail "connection profile is not valid JSON"

required_env=(
  BLOCKCHAIN_ANCHOR_ADAPTER
  FABRIC_ENABLED
  FABRIC_MODE
  FABRIC_GATEWAY_URL
  FABRIC_GATEWAY_HOST_ALIAS
  FABRIC_PEER_ENDPOINT
  FABRIC_MSP_ID
  FABRIC_CHANNEL
  FABRIC_CHAINCODE
  FABRIC_IDENTITY_CERT_PATH
  FABRIC_PRIVATE_KEY_PATH
  FABRIC_TLS_CERT_PATH
)

for name in "${required_env[@]}"; do
  grep -Eq "^${name}=.+" "${secret_root}/env.generated" ||
    fail "generated Fabric env file is missing ${name}"
done

if command -v stat >/dev/null 2>&1; then
  perms="$(stat -c "%a" "${secret_root}/identity/key.pem" 2>/dev/null || true)"
  if [ -n "${perms}" ]; then
    world_digit="${perms: -1}"
    if [ "${world_digit}" != "0" ]; then
      fail "private key must not be world-readable"
    fi
  fi
fi

echo "Fabric secret validation passed for ${secret_root}; file contents were not printed."
