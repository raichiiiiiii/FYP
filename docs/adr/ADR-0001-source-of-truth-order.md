# ADR-0001: Source of Truth Order

## Status

Accepted

## Context

MEPN has multiple artifacts:

- SRS
- SDD
- UI Flow Contract
- UI Flow Contract Appendix
- Figma Make prototype
- Existing production code

The team needs a clear rule for resolving conflicts between artifacts.

## Decision

The MEPN repository uses this source-of-truth order:

1. `docs/requirements/mudarabah_eprocurement_srs.tex`
2. `docs/design/mepn_software_design_description.tex`
3. `docs/ui/mepn-ui-contract-flow.md`
4. `docs/ui/mepn-ui-contract-flow-appendix.md`
5. `docs/ui/figma-to-ui-contract-map.md`
6. `docs/design/figma-make-reference/`
7. Existing implementation

## Consequence

The Figma Make prototype may guide layout and interaction design but cannot override domain rules, authorization, validation, state machines, audit behavior, or backend contracts.
