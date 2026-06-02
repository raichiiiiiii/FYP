# ADR-011: Implementation Stack for MEPN MVP

## Status

Accepted

## Context

The MEPN SDD defines a modular monolith MVP with frontend, API/backend, worker,
PostgreSQL, object storage, Redis/queue, and optional Fabric anchoring. The SRS
recommends React TypeScript, NestJS, PostgreSQL, Redis, object storage,
OAuth/OIDC, Fabric Gateway integration, and Docker Compose.

The SDD previously listed stack selection as an open question:

> OQ-01: Which implementation stack will be used for frontend, backend, workers, and migrations?

This ADR resolves that question for the MVP implementation.

## Decision

MEPN MVP will use:

- React + TypeScript + Vite for the web application.
- NestJS + TypeScript for the backend API.
- A separate worker application for async jobs.
- PostgreSQL as the operational database.
- Prisma for schema definition and migrations.
- Redis for queue/cache/locks.
- MinIO for local object storage.
- Local/dev authentication for the first runnable version, followed by OAuth/OIDC integration.
- Docker Compose for local/self-hosted development.
- REST/OpenAPI for frontend-backend communication.
- pnpm workspace for package management and monorepo structure.

## Consequences

This supports fast FYP development while remaining aligned with the SDD.
The system starts as a modular monolith and can later extract services if needed.
Fabric, ERP, finance API, and e-signature integrations will be implemented as adapters,
not as core dependencies for the first runnable version.

