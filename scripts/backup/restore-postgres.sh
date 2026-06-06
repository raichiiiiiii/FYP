#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER_NAME="${POSTGRES_USER_NAME:-mepn}"
TARGET_DATABASE="${TARGET_DATABASE:-mepn_restore}"
BACKUP_FILE=""
ASSUME_YES="false"
DRY_RUN="false"

usage() {
  cat <<'USAGE'
Usage: scripts/backup/restore-postgres.sh --backup-file PATH [options]

Restores a gzip PostgreSQL logical backup into a Docker Compose PostgreSQL
service. By default the target database is a disposable database named
`mepn_restore`.

Options:
  --backup-file PATH    Required .sql.gz backup artifact.
  --compose-file PATH   Compose file to use. Default: docker-compose.prod.yml
  --env-file PATH       Compose env file to use. Default: .env.production
  --service NAME        PostgreSQL service name. Default: postgres
  --user NAME           PostgreSQL user. Default: mepn
  --database NAME       Target database. Default: mepn_restore
  --yes                 Required for non-dry-run restore.
  --dry-run             Validate inputs without writing to PostgreSQL.
  -h, --help            Show this help.

Environment aliases:
  COMPOSE_FILE, ENV_FILE, POSTGRES_SERVICE, POSTGRES_USER_NAME, TARGET_DATABASE

The script prints paths, target database, and status only. It never prints
passwords, connection strings, or SQL dump contents.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup-file)
      BACKUP_FILE="$2"
      shift 2
      ;;
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
    --user)
      POSTGRES_USER_NAME="$2"
      shift 2
      ;;
    --database)
      TARGET_DATABASE="$2"
      shift 2
      ;;
    --yes)
      ASSUME_YES="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
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

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Missing required --backup-file PATH" >&2
  usage >&2
  exit 2
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Backup file is empty: $BACKUP_FILE" >&2
  exit 1
fi

if ! gzip -t "$BACKUP_FILE"; then
  echo "Backup file failed gzip validation: $BACKUP_FILE" >&2
  exit 1
fi

echo "PostgreSQL restore preflight passed"
echo "Compose file: $COMPOSE_FILE"
echo "Env file: $ENV_FILE"
echo "Service: $POSTGRES_SERVICE"
echo "Backup file: $BACKUP_FILE"
echo "Target database: $TARGET_DATABASE"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run complete; no database changes were made."
  exit 0
fi

if [[ "$ASSUME_YES" != "true" ]]; then
  echo "Restore requires --yes because it drops and recreates the target database." >&2
  echo "Target database: $TARGET_DATABASE" >&2
  exit 2
fi

echo "Dropping and recreating target database"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$POSTGRES_SERVICE" \
  sh -c 'dropdb --if-exists -U "$1" "$2" && createdb -U "$1" "$2"' \
  sh "$POSTGRES_USER_NAME" "$TARGET_DATABASE"

echo "Restoring backup into target database"
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$POSTGRES_SERVICE" \
  sh -c 'psql -U "$1" -d "$2" -v ON_ERROR_STOP=1 >/dev/null' \
  sh "$POSTGRES_USER_NAME" "$TARGET_DATABASE"

echo "Restore complete"
echo "Target database: $TARGET_DATABASE"
