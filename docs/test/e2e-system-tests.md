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
- `SRS-GRAPH-001`: read-only project graph opens source records and hides finance nodes by role.
- `SRS-INT-001`: integration actions queue outbox events through adapters, expose status/reconciliation, and keep request actions role-scoped.

## Runtime Shape
The E2E command starts Docker Compose, prepares a clean `mepn_e2e` PostgreSQL database, runs Prisma migrations, starts the API on port `3100`, and starts the web app on port `5174`.

## UAT Handoff
Automated E2E tests prove the baseline workflows before human UAT. Formal UAT
uses the Phase 12 documents:

- [UAT readiness plan](uat-readiness.md)
- [UAT scenario checklist](uat-scenario-checklist.md)
- [UAT defect log](uat-defect-log.md)
- [UAT feedback and supervisor notes](uat-feedback-and-supervisor-notes.md)

Seed repeatable UAT demo data with:

```bash
pnpm seed:uat
```
