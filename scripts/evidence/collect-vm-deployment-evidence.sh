#!/usr/bin/env bash
set -euo pipefail

compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
env_file="${ENV_FILE:-.env.production}"
fabric_env_file="${FABRIC_ENV_FILE:-/run/secrets/fabric/env.generated}"
base_url="${APP_BASE_URL:-http://localhost}"
hash_record_id="${HASH_RECORD_ID:-}"
output_file="${OUTPUT_FILE:-docs/evidence/deployment/latest-vm-deployment-evidence.txt}"

mkdir -p "$(dirname "${output_file}")"

sanitize() {
  sed -E \
    -e 's/-----BEGIN [^-]+-----[^-]*-----END [^-]+-----/[redacted-pem]/g' \
    -e 's/(password|secret|token|privateKey|private_key|JWT_SECRET|SESSION_SECRET)[=:][^[:space:]]+/\1=[redacted]/Ig' \
    -e 's/(FABRIC_PRIVATE_KEY_PEM|FABRIC_IDENTITY_CERT_PEM|FABRIC_TLS_CERT_PEM)=.*/\1=[redacted]/g'
}

compose() {
  if [ -f "${fabric_env_file}" ]; then
    docker compose -f "${compose_file}" --env-file "${env_file}" --env-file "${fabric_env_file}" "$@"
  else
    docker compose -f "${compose_file}" --env-file "${env_file}" "$@"
  fi
}

{
  echo "# VM Deployment Evidence"
  echo
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "Commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo
  echo "## Docker Compose ps"
  compose ps
  echo
  echo "## Docker Compose logs tail"
  compose logs --tail=100
  echo
  echo "## HTTP smoke"
  curl -I "${base_url}/" || true
  echo
  curl -fsS "${base_url}/api/v1/health" || true
  echo
  curl -fsS "${base_url}/api/v1/ready" || true
  echo
  curl -fsS "${base_url}/api/v1/integrations/fabric/status" || true
  echo
  if [ -n "${hash_record_id}" ]; then
    curl -fsS "${base_url}/api/v1/hash-records/${hash_record_id}/fabric-verification" || true
    echo
  else
    echo "HASH_RECORD_ID was not provided; Fabric verification endpoint evidence skipped."
  fi
} 2>&1 | sanitize > "${output_file}"

echo "Sanitized VM deployment evidence saved to ${output_file}"
