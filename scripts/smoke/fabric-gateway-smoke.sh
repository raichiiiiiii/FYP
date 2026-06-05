#!/usr/bin/env bash
set -euo pipefail

base_url="${APP_BASE_URL:-http://localhost}"
hash_record_id="${HASH_RECORD_ID:-}"
organization_id="${HASH_RECORD_ORGANIZATION_ID:-${ORGANIZATION_ID:-}}"
actor_user_id="${HASH_RECORD_ACTOR_USER_ID:-${ACTOR_USER_ID:-}}"

curl_json() {
  local url="$1"
  curl -fsS "${url}" | sanitize
}

sanitize() {
  sed -E \
    -e 's/-----BEGIN [^-]+-----[^-]*-----END [^-]+-----/[redacted-pem]/g' \
    -e 's/(privateKey|private_key|password|secret|token)"[[:space:]]*:[[:space:]]*"[^"]*"/\1":"[redacted]"/Ig' \
    -e 's/(FABRIC_PRIVATE_KEY_PEM|FABRIC_IDENTITY_CERT_PEM|FABRIC_TLS_CERT_PEM)=.*/\1=[redacted]/g'
}

echo "Fabric Gateway smoke test target: ${base_url}"
echo "Health:"
curl_json "${base_url}/api/v1/health"
echo

echo "Fabric integration status:"
curl_json "${base_url}/api/v1/integrations/fabric/status"
echo

if [ -n "${hash_record_id}" ]; then
  if [ -z "${organization_id}" ] || [ -z "${actor_user_id}" ]; then
    echo "Hash record Fabric verification requires HASH_RECORD_ORGANIZATION_ID/ORGANIZATION_ID and HASH_RECORD_ACTOR_USER_ID/ACTOR_USER_ID."
    exit 1
  fi

  echo "Hash record Fabric verification:"
  curl_json "${base_url}/api/v1/hash-records/${hash_record_id}/fabric-verification?organizationId=${organization_id}&actorUserId=${actor_user_id}"
  echo
else
  echo "HASH_RECORD_ID was not provided; hash-record verification smoke step skipped."
fi
