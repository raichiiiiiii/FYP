# Backup And Restore Runbook

## Status

Phase 7.1 backup/restore scope is defined. Executable scripts are added in
later Phase 7 slices.

## Runtime Data Inventory

| Data area | Compose source | Purpose | Backup status |
|---|---|---|---|
| PostgreSQL database | `postgres` service, `postgres_data` volume | Organizations, users, roles, procurement records, finance workflow state, evidence metadata, audit events, outbox events, report export jobs, worker heartbeat, Fabric anchor metadata. | Must be backed up. |
| MinIO object storage | `minio` service, `minio_data` volume | Uploaded evidence documents, generated report export artifacts, and object-backed review files. | Must be backed up when documents/exports matter for UAT or review. |
| Redis | `redis` service, `redis_data` volume | Runtime cache/queue support. Current source of truth remains PostgreSQL/outbox. | Optional; treat as disposable unless future implementation stores durable state. |
| Fabric Gateway secrets | `/run/secrets/fabric` read-only mount or `deploy/fabric` local mount | Identity cert, private key, TLS CA, connection profile, generated Fabric env. | Do not include in app data backup. Rotate/restore through secret-delivery workflow. |
| Local evidence docs | Repository `docs/evidence/` | Sanitized reviewer evidence committed to Git. | Covered by Git history, not Docker volume backup. |

## Source Of Truth

PostgreSQL is the primary transactional source of truth for MEPN workflow state.
MinIO/object storage is the source of truth for binary evidence and generated
export artifacts. Redis is not treated as authoritative for restore validation.

## Backup Scope

Minimum backup set for a reviewable restore:

1. PostgreSQL logical dump from the `postgres` service.
2. MinIO bucket/object backup when evidence documents or report exports are part
   of the scenario being restored.
3. The Git commit SHA and `.env.production` variable names used for the runtime,
   without secret values.

## Restore Scope

Minimum restore proof:

1. Restore PostgreSQL into a disposable or intended target database.
2. Restore object storage artifacts if the scenario depends on uploaded
   documents or generated exports.
3. Start the stack with the same application commit.
4. Run API health/readiness checks.
5. Confirm dashboard, procurement, finance, audit/hash, and report/export smoke
   paths can read restored data.

## Exclusions And Safety Rules

- Do not print, commit, or archive PEM files, private keys, tokens, or VM SSH
  material.
- Do not include `/run/secrets/fabric` or `deploy/fabric` in ordinary app data
  backup artifacts.
- Do not run destructive restore against a production-like database without an
  explicit confirmation flag.
- Do not use `docker compose down -v` before backup unless intentionally
  deleting all persisted Docker volumes.

## Known Gaps Before Later Phase 7 Slices

- `scripts/backup/backup-postgres.sh` is not yet implemented.
- `scripts/backup/restore-postgres.sh` is not yet implemented.
- `scripts/backup/smoke-restore.sh` is not yet implemented.
- MinIO/object-storage backup automation remains a later enhancement; the first
  executable slice focuses on PostgreSQL proof.
