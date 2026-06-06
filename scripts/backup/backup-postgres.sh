#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/backups}"

usage() {
  cat <<'USAGE'
Usage: scripts/backup/backup-postgres.sh [options]

Creates a timestamped PostgreSQL logical backup from a Docker Compose service.

Options:
  --compose-file PATH   Compose file to use. Default: docker-compose.prod.yml
  --env-file PATH       Compose env file to use. Default: .env.production
  --service NAME        PostgreSQL service name. Default: postgres
  --output-dir PATH     Backup artifact directory. Default: ./backups
  -h, --help            Show this help.

Environment aliases:
  COMPOSE_FILE, ENV_FILE, POSTGRES_SERVICE, OUTPUT_DIR

The script prints file paths, sizes, and status only. It never prints database
passwords, connection strings, or dump contents.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --service)
      POSTGRES_SERVICE="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

cd "$ROOT_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
umask 077

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
artifact="${OUTPUT_DIR%/}/mepn-postgres-${timestamp}.sql.gz"

echo "Starting PostgreSQL backup"
echo "Compose file: $COMPOSE_FILE"
echo "Env file: $ENV_FILE"
echo "Service: $POSTGRES_SERVICE"
echo "Output: $artifact"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$POSTGRES_SERVICE" \
  sh -c 'pg_dump -U "${POSTGRES_USER:-mepn}" "${POSTGRES_DB:-mepn}"' \
  | gzip -c > "$artifact"

if [[ ! -s "$artifact" ]]; then
  echo "Backup artifact is empty: $artifact" >&2
  exit 1
fi

if ! gzip -t "$artifact"; then
  echo "Backup artifact failed gzip validation: $artifact" >&2
  exit 1
fi

bytes="$(wc -c < "$artifact" | tr -d '[:space:]')"
echo "Backup complete"
echo "Artifact: $artifact"
echo "Size bytes: $bytes"
