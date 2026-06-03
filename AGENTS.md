# MEPN Codex Instructions

## Project

MEPN is a Mudarabah-Enabled Procurement Network. It is a distributed, self-hostable procurement-finance application for SME procurement workflows and restricted mudarabah financing.

## Source of truth order

1. `docs/requirements/mudarabah_eprocurement_srs.tex`
2. `docs/design/mepn_software_design_description.tex`
3. `docs/ui/mepn-ui-contract-flow.md`
4. `docs/ui/mepn-ui-contract-flow-appendix.md`
5. `docs/ui/figma-to-ui-contract-map.md`
6. `docs/design/figma-make-reference/`
7. Existing production code

## Figma rule

The Figma Make prototype is a visual and interaction reference only.

Do not treat it as the source of truth for:

- authorization
- validation
- workflow state transitions
- API contracts
- backend persistence
- audit behavior
- Fabric anchoring
- ledger calculations
- production routing
- deployment behavior

## Implementation rule

Implement one vertical slice at a time.

Before editing code, produce:

- current structure summary
- relevant requirements
- relevant UI contract sections
- relevant Figma files
- gap list
- implementation plan
- files expected to change

After editing code, run:

- lint
- typecheck
- unit tests
- relevant component/integration tests
- build

## Required behavior

- Prefer existing production components over copying Figma-generated components directly.
- Replace Figma mock data with typed DTOs, fixtures, or API calls.
- Enforce role and permission checks through reusable route/permission definitions.
- Include loading, empty, error, and permission-denied states.
- Do not fake successful Fabric anchoring.
- Do not fake successful payment, disbursement, or ledger closure.
- Do not calculate guaranteed fixed returns for mudarabah profit distribution.
- Document behavior changes in `docs/`.
