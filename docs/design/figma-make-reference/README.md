# MEPN Figma Make Reference

This folder contains the exported Figma Make prototype for the MEPN application.

## Purpose

This prototype is a visual and interaction reference. It is not the source of truth for business rules, authorization, validation, workflow states, audit behavior, API behavior, or deployment behavior.

## Source-of-truth order

1. `docs/requirements/mudarabah_eprocurement_srs.tex`
2. `docs/design/mepn_software_design_description.tex`
3. `docs/ui/mepn-ui-contract-flow.md`
4. `docs/ui/mepn-ui-contract-flow-appendix.md`
5. `docs/ui/figma-to-ui-contract-map.md`
6. `docs/design/figma-make-reference/`
7. Current production repository implementation

## Implementation rule

When the Figma prototype conflicts with the UI Flow Contract, follow the UI Flow Contract.

When the UI Flow Contract conflicts with the SRS or SDD, follow the SRS/SDD and update the UI Flow Contract through a documented change.

## How agents should use this folder

Agents may use this prototype to understand:

- application shell layout
- sidebar structure
- screen composition
- visual hierarchy
- card, table, badge, tab, and panel patterns
- dashboard density
- application workspace structure
- network canvas direction
- ledger and audit presentation
- admin and integration screen direction

Agents must not directly copy:

- mock role switching
- mock application data
- fake audit records
- fake Fabric status
- fake ledgers
- fake approval decisions
- prototype-only local state
- prototype-only routing
