#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

require_command jq
require_fabric_material

identity_dir="$FABRIC_SECRET_DIR/identity"
tls_dir="$FABRIC_SECRET_DIR/tls"
identity_cert="$(user_msp_dir)/signcerts/cert.pem"
identity_key="$(find_user_private_key)"
tls_cert="$(peer_tls_dir)/ca.crt"
connection_profile="$FABRIC_SECRET_DIR/connection-profile.json"
env_file="$FABRIC_SECRET_DIR/env.generated"

log "Exporting VM-local Fabric Gateway material to $FABRIC_SECRET_DIR"
sudo mkdir -p "$identity_dir" "$tls_dir"
sudo chown "$(id -u):$(id -g)" "$FABRIC_SECRET_DIR" "$identity_dir" "$tls_dir"
install -m 0640 "$identity_cert" "$identity_dir/cert.pem"
install -m 0600 "$identity_key" "$identity_dir/key.pem"
install -m 0640 "$tls_cert" "$tls_dir/ca.crt"

tmp_profile="$(mktemp)"
jq -n \
  --arg name "mepn-vm-local-fabric" \
  --arg channel "$FABRIC_CHANNEL" \
  --arg chaincode "$FABRIC_CHAINCODE" \
  --arg peerEndpoint "$FABRIC_PEER_ENDPOINT" \
  --arg gatewayUrl "$FABRIC_GATEWAY_URL" \
  --arg hostAlias "$FABRIC_GATEWAY_HOST_ALIAS" \
  --arg mspId "$FABRIC_MSP_ID" \
  '{
    name: $name,
    version: "1.0.0",
    client: { organization: "Org1" },
    organizations: {
      Org1: {
        mspid: $mspId,
        peers: [$hostAlias]
      }
    },
    peers: {
      ($hostAlias): {
        url: $gatewayUrl,
        grpcOptions: {
          "ssl-target-name-override": $hostAlias,
          hostnameOverride: $hostAlias
        },
        tlsCACerts: {
          path: "/run/secrets/fabric/tls/ca.crt"
        }
      }
    },
    channels: {
      ($channel): {
        chaincodes: [$chaincode],
        peers: {
          ($hostAlias): {}
        }
      }
    },
    metadata: {
      peerEndpoint: $peerEndpoint,
      gatewayHostAlias: $hostAlias
    }
  }' >"$tmp_profile"
install -m 0640 "$tmp_profile" "$connection_profile"
rm -f "$tmp_profile"

tmp_env="$(mktemp)"
cat >"$tmp_env" <<EOF
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
FABRIC_ENABLED=true
FABRIC_MODE=gateway
FABRIC_CHANNEL=$FABRIC_CHANNEL
FABRIC_CHAINCODE=$FABRIC_CHAINCODE
FABRIC_MSP_ID=$FABRIC_MSP_ID
FABRIC_IDENTITY=$FABRIC_IDENTITY
FABRIC_IDENTITY_CERT_PATH=/run/secrets/fabric/identity/cert.pem
FABRIC_PRIVATE_KEY_PATH=/run/secrets/fabric/identity/key.pem
FABRIC_TLS_CERT_PATH=/run/secrets/fabric/tls/ca.crt
FABRIC_PEER_ENDPOINT=$FABRIC_PEER_ENDPOINT
FABRIC_GATEWAY_URL=$FABRIC_GATEWAY_URL
FABRIC_GATEWAY_HOST_ALIAS=$FABRIC_GATEWAY_HOST_ALIAS
FABRIC_SUBMIT_TIMEOUT_MS=${FABRIC_SUBMIT_TIMEOUT_MS:-30000}
FABRIC_COMMIT_TIMEOUT_MS=${FABRIC_COMMIT_TIMEOUT_MS:-30000}
FABRIC_SECRET_MOUNT=$FABRIC_SECRET_DIR
EOF
install -m 0640 "$tmp_env" "$env_file"
rm -f "$tmp_env"

safe_file_status "$identity_dir/cert.pem" "identity certificate"
safe_file_status "$identity_dir/key.pem" "identity private key"
safe_file_status "$tls_dir/ca.crt" "TLS CA certificate"
safe_file_status "$connection_profile" "connection profile"
safe_file_status "$env_file" "generated env file"

log "Export completed. File contents were not printed."
