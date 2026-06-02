# ADR-013: Module Roadmap Feature Intake

## Status
Accepted

## Context
The MEPN prototype now has a working modular shell across identity, procurement,
evidence, audit, finance, integrations, testing, and role-aware frontend routes.
As new features are added, there is a risk that screens, API calls, database
changes, permissions, and tests are added directly in whichever file is easiest,
causing the application to become mixed again.

The SDD describes MEPN as a modular monolith. The repository should keep that
shape while the MVP grows.

## Decision
Every new feature must enter through one approved module roadmap before code is
implemented:

- Identity and Access
- Procurement
- Evidence and Audit
- Mudarabah Finance
- Graph/Canvas
- Integrations
- Reporting
- Administration
- Operations

Each feature must complete the feature intake template in
[Module Roadmap and Feature Intake](../roadmap/module-roadmap.md), including
SRS/SDD mapping, affected screens, API endpoints, database entities, audit
events, permissions, outbox side effects, tests, and documentation updates.

## Consequences
Feature work remains traceable to the SRS and SDD. New routes, API endpoints,
database models, audit events, and tests are added inside a declared module
boundary instead of being scattered across the app.

This adds a small planning step before implementation, but it protects the MVP
from becoming a mixed demo shell again.
