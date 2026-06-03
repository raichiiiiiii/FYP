# ADR-0003: Azure Student VM Docker Compose Deployment

## Status

Accepted

## Context

The project needs a low-cost cloud deployment suitable for:

- academic demonstration
- MVP validation
- self-hosted SME-node behavior
- UI/UX testing
- deployment documentation

## Decision

Deploy the MVP to an Azure Student VM using Docker Compose.

The target deployment contains:

- reverse proxy
- frontend container
- backend API container if available
- PostgreSQL container
- Redis container if required
- object storage or local volume
- optional Fabric adapter mock or external Fabric endpoint

## Consequence

This is appropriate for MVP/demo deployment.

It is not the final production architecture for high-availability regulated financial workloads.
