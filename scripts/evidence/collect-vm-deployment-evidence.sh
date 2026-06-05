#!/usr/bin/env bash
set -euo pipefail

compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
env_file="${ENV_FILE:-.env.production}"
fabric_env_file="${FABRIC_ENV_FILE:-/run/secrets/fabric/env.generated}"
base_url="${APP_BASE_URL:-http://localhost}"
hash_record_id="${HASH_RECORD_ID:-}"
output_file="${OUTPUT_FILE:-docs/evidence/deployment/latest-vm-deployment-evidence.txt}"
dry_run="${DRY_RUN:-false}"

mkdir -p "$(dirname "${output_file}")"

sanitize() {
  sed -E \
    -e '/-----BEGIN [^-]+-----/,/-----END [^-]+-----/c\[redacted-pem-block]' \
    -e 's/(Authorization:[[:space:]]*Bearer[[:space:]]+)[^[:space:]]+/\1[redacted]/Ig' \
    -e 's/(password|secret|token|privateKey|private_key|JWT_SECRET|SESSION_SECRET|DATABASE_URL|REDIS_URL)[=:][^[:space:]]+/\1=[redacted]/Ig' \
    -e 's/(FABRIC_PRIVATE_KEY_PEM|FABRIC_IDENTITY_CERT_PEM|FABRIC_TLS_CERT_PEM)=.*/\1=[redacted]/g' \
    -e 's#(postgresql|postgres|redis)://[^[:space:]]+#\1://[redacted]#Ig' \
    -e 's#(mongodb|mysql)://[^[:space:]]+#\1://[redacted]#Ig' \
    -e 's/(privateKey|private_key|password|secret|token)"[[:space:]]*:[[:space:]]*"[^"]*"/\1":"[redacted]"/Ig'
}

compose() {
  if [ -f "${fabric_env_file}" ]; then
    docker compose -f "${compose_file}" --env-file "${env_file}" --env-file "${fabric_env_file}" "$@"
  else
    docker compose -f "${compose_file}" --env-file "${env_file}" "$@"
  fi
}

tmp_output="$(mktemp)"
critical_status=0

run_section() {
  local title="$1"
  local criticality="$2"
  shift 2

  echo "## ${title}"
  set +e
  "$@"
  local status=$?
  set -e
  echo
  echo "Section exit code: ${status}"
  echo

  if [ "${criticality}" = "critical" ] && [ "${status}" -ne 0 ]; then
    critical_status=1
  fi
}

curl_head() {
  curl -fsSI "$1"
}

curl_json() {
  curl -fsS "$1"
}

write_header() {
  echo "# VM Deployment Evidence"
  echo
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "Commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
}

write_dry_run() {
  write_header
  echo "Mode: dry-run"
  echo
  echo "## Planned checks"
  echo "- docker compose ps"
  echo "- docker compose logs --tail=100"
  echo "- curl -I ${base_url}/"
  echo "- curl ${base_url}/api/v1/health"
  echo "- curl ${base_url}/api/v1/ready"
  echo "- curl ${base_url}/api/v1/integrations/fabric/status"
  if [ -n "${hash_record_id}" ]; then
    echo "- curl ${base_url}/api/v1/hash-records/[hash-record-id]/fabric-verification"
  else
    echo "- hash-record Fabric verification skipped because HASH_RECORD_ID is not set"
  fi
  echo
  echo "Summary status: dry-run only; no VM commands executed."
}

{
  if [ "${dry_run}" = "true" ]; then
    write_dry_run
  else
    write_header
    echo
    run_section "Docker Compose ps" critical compose ps
    run_section "Docker Compose logs tail" noncritical compose logs --tail=100
    run_section "HTTP home HEAD" critical curl_head "${base_url}/"
    run_section "API health" critical curl_json "${base_url}/api/v1/health"
    run_section "API readiness" noncritical curl_json "${base_url}/api/v1/ready"
    run_section "Fabric integration status" noncritical curl_json "${base_url}/api/v1/integrations/fabric/status"

    if [ -n "${hash_record_id}" ]; then
      run_section \
        "Hash record Fabric verification" \
        noncritical \
        curl_json \
        "${base_url}/api/v1/hash-records/${hash_record_id}/fabric-verification"
    else
      echo "## Hash record Fabric verification"
      echo "HASH_RECORD_ID was not provided; Fabric verification endpoint evidence skipped."
      echo
    fi

    if [ "${critical_status}" -eq 0 ]; then
      echo "Summary status: passed critical deployment smoke checks."
    else
      echo "Summary status: failed one or more critical deployment smoke checks."
    fi
  fi
} >"${tmp_output}" 2>&1

sanitize <"${tmp_output}" >"${output_file}"
rm -f "${tmp_output}"

echo "Sanitized VM deployment evidence saved to ${output_file}"

if [ "${dry_run}" != "true" ] && [ "${critical_status}" -ne 0 ]; then
  exit 1
fi
