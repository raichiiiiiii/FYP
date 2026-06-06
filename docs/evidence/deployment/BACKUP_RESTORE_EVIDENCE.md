# Backup / Restore Evidence

## Status

Implemented for PostgreSQL backup/restore proof in the current FYP review
scope.

The repository includes repeatable scripts for:

- PostgreSQL logical backup
- PostgreSQL restore into an explicitly confirmed target database
- Restore smoke validation against a restored target database

## Source Evidence

| Area | Evidence |
|---|---|
| Runbook | `docs/deployment/backup-restore-runbook.md` |
| Backup script | `scripts/backup/backup-postgres.sh` |
| Restore script | `scripts/backup/restore-postgres.sh` |
| Smoke script | `scripts/backup/smoke-restore.sh` |
| Compose data sources | `docker-compose.prod.yml`, `infra/docker-compose.yml` |

## Commands Run

```powershell
bash -n scripts/backup/backup-postgres.sh
bash scripts/backup/backup-postgres.sh --compose-file infra/docker-compose.yml --env-file .env.production.example --output-dir artifacts/backup-smoke
bash -n scripts/backup/restore-postgres.sh
bash scripts/backup/restore-postgres.sh --backup-file artifacts/backup-smoke/<artifact>.sql.gz --compose-file infra/docker-compose.yml --env-file .env.production.example --database mepn_restore_smoke --dry-run
bash scripts/backup/restore-postgres.sh --backup-file artifacts/backup-smoke/<artifact>.sql.gz --compose-file infra/docker-compose.yml --env-file .env.production.example --database mepn_restore_smoke --yes
bash -n scripts/backup/smoke-restore.sh
bash scripts/backup/smoke-restore.sh --compose-file infra/docker-compose.yml --env-file .env.production.example --database mepn_restore_smoke
bash scripts/backup/smoke-restore.sh --compose-file infra/docker-compose.yml --env-file .env.production.example --database mepn_restore_smoke --require-demo-data
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

## Sanitized Result

| Check | Result | Sanitized output |
|---|---|---|
| Backup artifact | Pass | Created `artifacts/backup-smoke/mepn-postgres-<timestamp>.sql.gz`; gzip validation passed; non-zero size recorded. |
| Restore dry run | Pass | Backup file existed, was non-empty, and passed gzip validation. No database changes were made. |
| Disposable restore | Pass | Restored into `mepn_restore_smoke`; active `mepn` database was not targeted. |
| Restore smoke | Pass | Required tables present; sanitized counts: organizations 17, projects 14, suppliers 12, requisitions 10, applications 8, audit events 332. |
| Demo-data gate | Pass | `--require-demo-data` passed against the disposable restored database. |
| Static/build checks | Pass | `lint`, `typecheck`, and `build` passed. |

## Safety Notes

- Backup artifacts are written under ignored paths by default for local smoke
  runs (`artifacts/` or `backups/`).
- The restore script defaults to a disposable target database (`mepn_restore`)
  and requires `--yes` for any actual restore.
- Scripts print paths, statuses, and counts only. They do not print database
  passwords, connection strings, SQL row contents, PEM material, or VM secrets.
- Fabric Gateway secrets under `/run/secrets/fabric` or `deploy/fabric` are not
  part of ordinary app data backup; restore them through the secret-delivery
  workflow/runbook.

## Known Limitations

- PostgreSQL backup/restore proof is implemented; MinIO/object storage backup
  automation remains future hardening.
- Redis is treated as disposable runtime state for the current architecture.
- The smoke proof validates restored database shape and counts, not a full
  browser walkthrough against an app reconfigured to the restored disposable
  database.
- Managed cloud database backup, object lifecycle policy, and scheduled backup
  jobs are post-demo production hardening items.
