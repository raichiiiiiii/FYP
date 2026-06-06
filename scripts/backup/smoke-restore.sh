#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER_NAME="${POSTGRES_USER_NAME:-mepn}"
TARGET_DATABASE="${TARGET_DATABASE:-mepn_restore}"
APP_BASE_URL="${APP_BASE_URL:-}"
REQUIRE_DEMO_DATA="false"

usage() {
  cat <<'USAGE'
Usage: scripts/backup/smoke-restore.sh [options]

Checks a restored PostgreSQL database for expected MEPN schema and safe record
counts. Optionally checks app health when APP_BASE_URL or --app-base-url is set.

Options:
  --compose-file PATH     Compose file to use. Default: docker-compose.prod.yml
  --env-file PATH         Compose env file to use. Default: .env.production
  --service NAME          PostgreSQL service name. Default: postgres
  --user NAME             PostgreSQL user. Default: mepn
  --database NAME         Restored database to inspect. Default: mepn_restore
  --app-base-url URL      Optional app base URL, for example http://localhost
  --require-demo-data     Fail if core restored record counts are zero.
  -h, --help              Show this help.

The script prints sanitized counts and health statuses only. It never prints
passwords, connection strings, or database row contents.
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
    --user)
      POSTGRES_USER_NAME="$2"
      shift 2
      ;;
    --database)
      TARGET_DATABASE="$2"
      shift 2
      ;;
    --app-base-url)
      APP_BASE_URL="$2"
      shift 2
      ;;
    --require-demo-data)
      REQUIRE_DEMO_DATA="true"
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

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

psql_scalar() {
  local sql="$1"

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$POSTGRES_SERVICE" \
    sh -c 'psql -U "$1" -d "$2" -At -v ON_ERROR_STOP=1 -c "$3"' \
    sh "$POSTGRES_USER_NAME" "$TARGET_DATABASE" "$sql" \
    | tr -d '\r'
}

table_count() {
  local table_name="$1"

  psql_scalar "select count(*) from \"$table_name\";"
}

echo "Restore smoke check"
echo "Compose file: $COMPOSE_FILE"
echo "Env file: $ENV_FILE"
echo "Service: $POSTGRES_SERVICE"
echo "Target database: $TARGET_DATABASE"

required_tables=(
  Organization
  User
  Membership
  Project
  Supplier
  Requisition
  MudarabahApplication
  AuditEvent
)

missing_tables="$(psql_scalar "
select string_agg(expected.table_name, ',')
from (values
  ('Organization'),
  ('User'),
  ('Membership'),
  ('Project'),
  ('Supplier'),
  ('Requisition'),
  ('MudarabahApplication'),
  ('AuditEvent')
) as expected(table_name)
where to_regclass(format('public.%I', expected.table_name)) is null;
")"

if [[ -n "$missing_tables" ]]; then
  echo "Missing required tables: $missing_tables" >&2
  exit 1
fi

echo "Required tables: present"

organization_count="$(table_count Organization)"
project_count="$(table_count Project)"
supplier_count="$(table_count Supplier)"
requisition_count="$(table_count Requisition)"
application_count="$(table_count MudarabahApplication)"
audit_count="$(table_count AuditEvent)"

echo "Organizations: $organization_count"
echo "Projects: $project_count"
echo "Suppliers: $supplier_count"
echo "Requisitions: $requisition_count"
echo "Applications: $application_count"
echo "Audit events: $audit_count"

if [[ "$REQUIRE_DEMO_DATA" == "true" ]]; then
  for count in \
    "$organization_count" \
    "$project_count" \
    "$supplier_count" \
    "$requisition_count" \
    "$application_count" \
    "$audit_count"; do
    if [[ "$count" == "0" ]]; then
      echo "Required demo-data count was zero" >&2
      exit 1
    fi
  done
fi

if [[ -n "$APP_BASE_URL" ]]; then
  trimmed_base="${APP_BASE_URL%/}"
  echo "Checking app health: ${trimmed_base}/api/v1/health"
  curl -fsS "${trimmed_base}/api/v1/health" >/dev/null
  echo "API health: reachable"
fi

echo "Restore smoke check passed"
