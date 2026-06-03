# ADR-0002: Figma Make as Reference Only

## Status

Accepted

## Context

The Figma Make export is generated prototype code. It contains useful layout and UX patterns but may include:

- local state
- mock data
- mock roles
- mock audit records
- mock Fabric status
- prototype-only navigation

## Decision

The Figma Make export is stored under:

`docs/design/figma-make-reference/`

It is excluded from production application imports.

## Consequence

Production implementation must translate the design into the existing frontend architecture rather than copy the prototype wholesale.

Agents may use the Figma Make files for:

- visual hierarchy
- layout patterns
- navigation shape
- component composition
- UX density

Agents must not use the Figma Make files as authority for:

- business rules
- permissions
- validation
- API behavior
- audit behavior
- ledger calculations
- deployment behavior
