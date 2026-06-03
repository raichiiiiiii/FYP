# UI/UX Close Alignment Blockers TODO

## Purpose

This file tracks blockers found during the UI/UX close-alignment round.

Use this file when implementation cannot safely continue because of:

- missing backend DTO
- unclear UI contract
- Figma behavior conflicting with production workflow
- missing permission model
- missing test fixture
- fixture/API mismatch
- visual requirement that needs design decision
- accessibility issue requiring deeper refactor
- deployment/runtime blocker

## Blocker format

| ID | Phase | Area | Blocker | Impact | Proposed resolution | Owner | Status |
|---|---|---|---|---|---|---|---|
| UXB-001 | 1 | App shell/sidebar | Figma sidebar includes prototype role switching and anchor widgets that cannot be copied directly. | Risk of introducing non-production auth behavior or fake anchor state. | Adapt visual hierarchy only; drive role and anchor display from production session, route metadata, and real/mock-labeled API state. | Frontend | Open |
| UXB-002 | 2 | Landing/auth/org setup | Figma cloud-entry flow is richer than current dev login and organization setup. | Visual alignment cannot be completed without deciding which public landing and first-run flow belongs in MVP. | Confirm MVP entry flow: dev login only, public landing, or first-run organization wizard. | Product/Frontend | Open |
| UXB-003 | 3 | Dashboard | Dashboard KPIs, task inbox, and activity data are partly model/fixture-driven. | Figma-like dashboard density may imply backend-backed operational data that does not yet exist. | Define dashboard DTOs for tasks, evidence gaps, review queues, audit/outbox signals, and role KPIs. | Backend/Frontend | Open |
| UXB-004 | 4 | Procurement | Figma procurement hub includes analytics, supplier scoring, exceptions, and richer tabs beyond current workflow screens. | UI polish could overstate unfinished procurement intelligence features. | Split procurement alignment into API-backed details first, then clearly labeled analytics/exception slices. | Backend/Frontend | Open |
| UXB-005 | 5 | Applications/opportunities | Production RBAC currently keeps procurement officers out of Finance Opportunities, while some earlier planning text is broader. | Role-flow confusion can reappear in nav, E2E, or UAT scripts. | Keep current stricter RBAC unless source-of-truth docs are updated; document any role-matrix change before code. | Product/Frontend | Open |
| UXB-006 | 6 | Application workspace | Current workspace has working E2E actions, but visual alignment could disturb high-risk finance gates. | Risk of weakening evidence, due diligence, Shariah, contract, or approval rules. | Refactor panels incrementally with tests for blocked and allowed transitions before visual expansion. | Frontend/API | Open |
| UXB-007 | 7 | Ledger/P&L/closure | Figma ledger visuals are richer, but mudarabah rules forbid guaranteed fixed return behavior. | Misleading finance UI could create Shariah/product correctness risk. | Keep calculation helpers and tests as source of truth; add explanatory UI only after domain-safe test coverage. | Product/Frontend | Open |
| UXB-008 | 8 | Audit/evidence/Fabric | Figma audit screens show advanced verification states; production Fabric remains mock/adapter-based. | UI could accidentally imply real successful anchoring. | Show `pending`, `verified`, `failed`, `unavailable`, and mock states explicitly; never show real verification without backend evidence. | Backend/Frontend | Open |
| UXB-009 | 9 | Graph/canvas | Figma canvas includes richer overlays and interactions than the current read-only graph. | Drag/drop or annotations could imply source-of-truth editing. | Keep graph read-only until backend graph write model and permission rules are documented. | Product/Frontend | Open |
| UXB-010 | 10 | Integrations/operations | Integration status may rely on mock adapters, outbox rows, or partial health checks. | UI could overstate ERP, Fabric, e-signature, webhook, or deployment readiness. | Label mock adapters clearly and expose retry/degraded/unavailable states from backend status data. | Backend/Frontend | Open |
| UXB-011 | 11 | Admin/reports | Reports and advanced admin settings are mapped in Figma but not fully production-backed. | Visual screens may become static shells without auditability or export correctness. | Implement reports/admin slices only after DTOs, permissions, audit events, and tests are defined. | Backend/Frontend | Open |
| UXB-012 | 12 | Accessibility/responsive QA | Current documentation notes responsive and accessibility risks not fully verified from source alone. | UAT may uncover avoidable keyboard, focus, label, tab order, or mobile layout issues. | Add targeted accessibility and responsive checks per major screen after visual alignment. | Frontend/QA | Open |
