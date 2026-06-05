#!/usr/bin/env bash
set -euo pipefail

secret_root="${FABRIC_SECRET_DIR:-/run/secrets/fabric}"

required_vars=(
  FABRIC_IDENTITY_CERT_PEM
  FABRIC_PRIVATE_KEY_PEM
  FABRIC_TLS_CERT_PEM
  FABRIC_GATEWAY_URL
  FABRIC_GATEWAY_HOST_ALIAS
  FABRIC_PEER_ENDPOINT
  FABRIC_MSP_ID
  FABRIC_CHANNEL
  FABRIC_CHAINCODE
)

for name in "${required_vars[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required Fabric secret or setting: ${name}" >&2
    exit 1
  fi
done

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

install -m 700 -d "${tmp_dir}/identity" "${tmp_dir}/tls"
printf '%s' "${FABRIC_IDENTITY_CERT_PEM}" > "${tmp_dir}/identity/cert.pem"
printf '%s' "${FABRIC_PRIVATE_KEY_PEM}" > "${tmp_dir}/identity/key.pem"
printf '%s' "${FABRIC_TLS_CERT_PEM}" > "${tmp_dir}/tls/ca.crt"
chmod 600 "${tmp_dir}/identity/key.pem"
chmod 644 "${tmp_dir}/identity/cert.pem" "${tmp_dir}/tls/ca.crt"

FABRIC_SECRET_ROOT="${secret_root}" \
FABRIC_PROFILE_OUTPUT="${tmp_dir}/connection-profile.json" \
python3 - <<'PY'
import json
import os
from pathlib import Path

root = Path(os.environ["FABRIC_SECRET_ROOT"])
gateway_url = os.environ["FABRIC_GATEWAY_URL"]
host_alias = os.environ["FABRIC_GATEWAY_HOST_ALIAS"]
peer_endpoint = os.environ["FABRIC_PEER_ENDPOINT"]
msp_id = os.environ["FABRIC_MSP_ID"]

profile = {
    "name": "mepn-fabric-gateway",
    "version": "1.0.0",
    "client": {
        "organization": msp_id,
        "connection": {
            "timeout": {
                "peer": {
                    "endorser": "30"
                }
            }
        },
    },
    "organizations": {
        msp_id: {
            "mspid": msp_id,
            "peers": [host_alias],
            "certificateAuthorities": [],
        }
    },
    "peers": {
        host_alias: {
            "url": gateway_url,
            "tlsCACerts": {
                "path": str(root / "tls" / "ca.crt")
            },
            "grpcOptions": {
                "ssl-target-name-override": host_alias,
                "hostnameOverride": host_alias,
                "peerEndpoint": peer_endpoint,
            },
        }
    },
}

Path(os.environ["FABRIC_PROFILE_OUTPUT"]).write_text(
    json.dumps(profile, indent=2) + "\n",
    encoding="utf-8",
)
PY

cat > "${tmp_dir}/env.generated" <<EOF
BLOCKCHAIN_ANCHOR_ADAPTER=fabric
FABRIC_ENABLED=true
FABRIC_MODE=gateway
FABRIC_SECRET_MOUNT=${secret_root}
FABRIC_GATEWAY_URL=${FABRIC_GATEWAY_URL}
FABRIC_GATEWAY_HOST_ALIAS=${FABRIC_GATEWAY_HOST_ALIAS}
FABRIC_PEER_ENDPOINT=${FABRIC_PEER_ENDPOINT}
FABRIC_MSP_ID=${FABRIC_MSP_ID}
FABRIC_CHANNEL=${FABRIC_CHANNEL}
FABRIC_CHAINCODE=${FABRIC_CHAINCODE}
FABRIC_IDENTITY=${FABRIC_IDENTITY:-${FABRIC_MSP_ID}}
FABRIC_IDENTITY_CERT_PATH=/run/secrets/fabric/identity/cert.pem
FABRIC_PRIVATE_KEY_PATH=/run/secrets/fabric/identity/key.pem
FABRIC_TLS_CERT_PATH=/run/secrets/fabric/tls/ca.crt
FABRIC_CONNECTION_PROFILE=/run/secrets/fabric/connection-profile.json
FABRIC_SUBMIT_TIMEOUT_MS=${FABRIC_SUBMIT_TIMEOUT_MS:-30000}
FABRIC_COMMIT_TIMEOUT_MS=${FABRIC_COMMIT_TIMEOUT_MS:-30000}
EOF

sudo install -m 700 -d "${secret_root}/identity" "${secret_root}/tls"
sudo install -m 644 "${tmp_dir}/identity/cert.pem" "${secret_root}/identity/cert.pem"
sudo install -m 600 "${tmp_dir}/identity/key.pem" "${secret_root}/identity/key.pem"
sudo install -m 644 "${tmp_dir}/tls/ca.crt" "${secret_root}/tls/ca.crt"
sudo install -m 644 "${tmp_dir}/connection-profile.json" "${secret_root}/connection-profile.json"
sudo install -m 640 "${tmp_dir}/env.generated" "${secret_root}/env.generated"

if [ -n "${FABRIC_SECRET_OWNER:-${USER:-}}" ]; then
  sudo chown -R "${FABRIC_SECRET_OWNER:-${USER}}" "${secret_root}"
fi

echo "Fabric Gateway secret files were written to ${secret_root} without printing secret contents."
