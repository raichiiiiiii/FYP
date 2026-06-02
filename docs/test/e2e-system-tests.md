# MEPN E2E System Test Coverage

## Purpose
The Playwright suite verifies MEPN workflows from the browser through the API and PostgreSQL-backed state.

## Command
```bash
pnpm test:e2e
```

## SRS Mapping
- `SRS-HEALTH-001`: dashboard walking skeleton verifies API, PostgreSQL, and Redis health.
- `SRS-ID-001`: organization setup creates organization, admin user, session, and audit event.
- `SRS-ID-002`: admin creates roles/users and assigns organization membership.
- `SRS-PROC-001`: procurement source-to-pay flow reaches invoice and writes audit timeline events.
- `SRS-EVID-001`: evidence document registration, pack export, canonical hash verification, and entity timeline work.
- `SRS-FIN-001`: mudarabah application moves from opportunity through checklist, due diligence, Shariah review, and approval.
- `SRS-FIN-002`: contract signing, disbursement, ledger, profit/loss, and closure pack reach closed state.

## Runtime Shape
The E2E command starts Docker Compose, prepares a clean `mepn_e2e` PostgreSQL database, runs Prisma migrations, starts the API on port `3100`, and starts the web app on port `5174`.
