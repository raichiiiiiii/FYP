---

## 26. Cloud Server Entry, Organization Bootstrap, and Platform Manager Dashboard Contract

### 26.1 Position

The current contract already contains the required building blocks for authentication, organization setup, organization context, and role-based landing. This section makes the cloud-entry wording explicit so developers do not interpret MEPN as starting only from an already-authenticated internal dashboard.

The intended user journey is:

```text
User opens MEPN cloud/server URL
  -> Public cloud landing page
  -> Choose one:
       A. Sign in to existing organization
       B. Register a new organization
       C. Accept an invitation
  -> Authenticate as a human user
  -> Bind session to one organization/workspace context
  -> Enter role landing page
  -> Platform Manager / SME Admin reaches dashboard
  -> Dashboard shows setup, health, users, integrations, evidence, and next tasks
```

Important terminology rule:

```text
The user does not authenticate "as an organization" literally.
The user authenticates as a human identity, then the system resolves or creates
the organization context through Membership, Invitation, Workspace, Role, and Permission.
```

This avoids a security mistake where the organization itself is treated as the principal. The authenticated principal is the user or service client; the organization is the tenant/context.

### 26.2 Does this contradict the SRS, SDD, or product vision?

No. This flow is aligned with the SRS, SDD, deployment guide, and product vision when interpreted as:

```text
cloud/server landing -> human authentication -> organization registration/selection -> organization-scoped dashboard
```

It supports:

| Source concern | Alignment |
|---|---|
| SME self-hosted or managed deployment | The cloud/server URL can be an Azure prototype endpoint, self-hosted SME domain, or future managed domain. |
| `UC-01 Install and configure SME node` | A first-run organization registration path is the UI counterpart of node setup and organization profile creation. |
| `UC-02 Authenticate and authorize user` | The login/callback/session flow maps identity to organization roles before protected records are visible. |
| Identity and Access module | Organization, User, Role, Permission, Membership, Workspace, and Invitation are the right primitives for this flow. |
| Product vision | The dashboard is not the final business cockpit; it is the entry/control surface before the graph/canvas and procurement-finance workspaces. |

The only wording to avoid is:

```text
Authenticate as organization
```

Use this instead:

```text
Authenticate as user, then select/register organization context.
```

If "platform manager" means the SME's organization administrator, it maps cleanly to `SME Admin` / `ORG_ADMIN`. If it means a global SaaS operator managing many unrelated tenant organizations, then a new `PLATFORM_OPERATOR` role, additional cross-tenant safeguards, and new SRS/SDD traceability would be required.

### 26.3 Route and state flow

| Step | Route | Actor state | UI decision | API/backend responsibility | Next state |
|---|---|---|---|---|---|
| Open cloud server | `/` or `/landing` | Anonymous or returning user | Show public landing; if valid session exists, silently evaluate role landing. | Optional safe health ping; no confidential data. | `ANONYMOUS`, `SESSION_CHECKING`, or redirect |
| Sign in | `/login` | Anonymous | Choose existing organization sign-in, dev login, or OIDC login. | Start local/dev auth or OIDC authorization code with PKCE. | `AUTHENTICATING` |
| OIDC callback | `/auth/callback` | Callback validating | Show validation progress and error-safe recovery. | Validate issuer, audience, expiry, signature, nonce, state, scopes. | `AUTHENTICATED_NO_ORG`, `AUTHORIZED`, or `TOKEN_INVALID` |
| Register organization | `/org/register` or `/org/setup` | Authenticated no org, or bootstrap admin | Capture legal name, registration number, tax ID, Shariah profile, deployment mode, admin profile. | Create Organization, User if needed, Role, Membership, Workspace, audit events. | `ORG_ACTIVE`, `AUTHORIZED` |
| Accept invitation | `/invite/:token` | Invited user | Validate token, show role/workspace, login/register if needed. | Create/activate Membership; bind acceptedById; audit invitation acceptance. | `AUTHORIZED` |
| Organization context | `/auth/session` or route loader | Authenticated user | If multiple orgs, ask user to choose organization. | Verify active Membership and role/permission set. | `ORG_CONTEXT_SELECTED` |
| Platform manager dashboard | `/dashboard` | SME Admin / ORG_ADMIN | Show setup health, org profile, users/roles, integrations, backups, deployment readiness, next tasks. | Aggregate health, org, memberships, audit, outbox, backup/readiness data. | `READY_FOR_SETUP_TASKS` or `READY_FOR_COCKPIT` |
| Product cockpit | `/graph/projects` or role-specific route | Authorized role | Continue to graph/canvas, procurement, finance, evidence, audit, or integration queue. | Enforce route permission and workspace/object scope. | Business workflow |

### 26.4 Screen Contract: Cloud Server Landing Page

| Field | Value |
|---|---|
| Route | `/` or `/landing` |
| Module | Public Bootstrap / Identity and Access |
| Primary roles | Anonymous visitor, returning authenticated user |
| Supporting roles | SME Admin, Developer/Integrator |
| SRS mapping | `UC-01`, `UC-02`, `FR-01`, `FR-02`, `FR-03`, `IR-02`, `IR-03`, `NFR-08`, `NFR-19` |
| SDD mapping | Identity and Access, Security Architecture, Deployment Architecture, Observability/Ops |
| Status | Planned contract; current implementation may route directly to `/dashboard` or `/org/setup` in local/dev mode |

Purpose:

```text
Give users a safe entry point into the hosted MEPN node without exposing protected
organization data. The page lets the user sign in to an existing organization,
register a new organization, or accept an invitation.
```

Data displayed:

| UI area | Data source | Required fields / behavior |
|---|---|---|
| Product header | Static config | Product name, environment label if non-production, deployment mode label where safe. |
| Safe service status | `GET /api/v1/health` or static app config | Show generic availability only. Do not expose internal database/Redis/MinIO details to anonymous users. |
| Existing organization CTA | Static/login config | "Sign in" starts OIDC/local login and preserves `returnTo`. |
| Register organization CTA | Route config | "Register organization" opens `/org/register` or `/org/setup`. |
| Invitation CTA | Token route | "I have an invitation" opens `/invite/:token` or token-entry form if supported. |
| Trust/safety note | Static content | Explain that procurement, finance, and evidence records are shown only after authorization. |

Allowed actions:

| Action | Visible to | Enabled when | API / route | Result |
|---|---|---|---|---|
| Sign in | Anonymous | Auth provider configured or dev auth enabled | `/login`, OIDC authorize, or `POST /api/v1/auth/dev-login` | Session flow starts |
| Register organization | Anonymous or authenticated no-org user | Registration/bootstrap enabled | `/org/register` or `/org/setup` | Organization setup flow starts |
| Accept invitation | Anonymous or authenticated user | Token exists and is not expired/revoked | `/invite/:token` | Invitation flow starts |
| Continue existing session | Returning user | Valid session exists | `GET /api/v1/auth/session` | Redirect to role landing |
| View public docs/help | Anonymous | Static help enabled | static link | No protected data |

Validation and security rules:

| Rule | Frontend behavior | Backend behavior |
|---|---|---|
| Existing session valid | Skip landing after brief session check and redirect to role landing. | Return session with active orgs/roles/scopes only. |
| Existing session expired | Show login with `returnTo` preserved. | Return `401 SESSION_EXPIRED`; audit if session was previously known. |
| No organization | Show register organization / accept invite path. | Do not return protected business records. |
| No role | Show no-access route after login. | Return `403 INSUFFICIENT_PERMISSION`; create access-denied audit event. |
| Anonymous health check | Show only generic availability. | Do not expose secrets, container names, database host, or internal stack traces. |
| Production OIDC | Do not trust client-supplied `actorUserId`. | Derive actor from token claims and membership; validate issuer/audience/nonce/scope. |

Audit/evidence/outbox side effects:

| Event | Trigger | Notes |
|---|---|---|
| `LANDING_OPENED` | Optional analytics/audit in non-sensitive form | Do not track confidential data. |
| `LOGIN_STARTED` | User starts login | Include provider and `returnTo` safely. |
| `LOGIN_SUCCEEDED` | Session established | Link user and organization context when known. |
| `LOGIN_FAILED` | Token/dev login failure | Do not log secrets/tokens. |
| `ORGANIZATION_REGISTRATION_STARTED` | User starts registration | Optional event before org exists. |
| `ACCESS_DENIED` | Authenticated user lacks role/workspace | Must be auditable. |

Acceptance criteria:

```text
- Anonymous users can reach the cloud/server URL without seeing protected data.
- Returning authorized users are routed to the correct role landing page.
- Authenticated users with no organization are routed to organization registration or invitation acceptance.
- Login preserves the user's intended destination through `returnTo`.
- The landing page does not expose database, Redis, MinIO, worker, Fabric, or secret details.
- Production authentication derives actor identity from token/session, not from arbitrary request body fields.
```

### 26.5 Screen Contract: Organization Registration / First-Run Setup

| Field | Value |
|---|---|
| Route | `/org/register` or `/org/setup` |
| Module | Identity and Access / Administration |
| Primary role | Bootstrap user, future SME Admin |
| Supporting roles | Developer/Integrator |
| SRS mapping | `UC-01`, `FR-01`, `FR-02`, `FR-03`, `FR-05`, `NFR-07`, `NFR-19`, `NFR-21` |
| SDD mapping | Identity and Access, Deployment Architecture, Security Architecture, Data Model |
| Current endpoint baseline | `POST /api/v1/orgs`, `POST /api/v1/users`, `POST /api/v1/roles`, `POST /api/v1/memberships`, `GET /api/v1/auth/session` |

Purpose:

```text
Create the first organization context and platform-manager/SME-admin access so
users can enter MEPN with a valid tenant boundary, role, workspace, and audit trail.
```

Required fields:

| Field | Required? | Rule |
|---|---:|---|
| Organization legal name | Yes | Must be non-empty and human-readable. |
| Registration number | Recommended | Required where jurisdiction/business process requires it. |
| Tax identifier | Optional / configurable | Should support local tax labels. |
| Shariah profile | Optional at bootstrap; required before Shariah-sensitive finance templates | Can be completed later by authorized admin/reviewer. |
| Deployment mode | Yes | Default `standalone_sme`; choices must match allowed SRS/SDD deployment modes. |
| Admin display name | Yes | Used for initial user record. |
| Admin email | Yes | Must be valid email and unique as user identity. |
| Data residency / backup region | Planned | Required before production-readiness confirmation. |

Created records:

```text
Organization
User
Role ORG_ADMIN / SME Admin
Membership
Default Workspace
AuditEvent ORGANIZATION_CREATED
AuditEvent USER_CREATED
AuditEvent MEMBERSHIP_ASSIGNED
AuditEvent ORG_CONTEXT_SELECTED
```

Validation and error healing:

| Error | Required UI behavior |
|---|---|
| Email already exists | Offer sign-in and organization join/invitation path instead of dead-end failure. |
| Organization already exists for same admin | Offer organization switcher. |
| Missing deployment mode | Default safely to `standalone_sme` and explain. |
| IdP unavailable during bootstrap | Allow local bootstrap admin only if deployment policy permits; flag OIDC setup as incomplete. |
| Backup/data residency not configured | Allow dashboard entry but show setup task and prevent production-ready confirmation. |

Acceptance criteria:

```text
- Registration creates an organization-scoped admin context, not a global unrestricted account.
- The first admin can reach `/dashboard` after organization setup.
- The dashboard clearly shows incomplete setup tasks rather than pretending the node is production-ready.
- Every created identity/organization record has an audit event or traceable setup record.
```

### 26.6 Screen Contract: Platform Manager / SME Admin Dashboard

| Field | Value |
|---|---|
| Route | `/dashboard` |
| Module | Home / Administration / Operations |
| Primary role | SME Admin / Platform Manager |
| Supporting roles | Developer/Integrator, Auditor read-only where allowed |
| SRS mapping | `UC-01`, `UC-02`, `FR-01`, `FR-03`, `FR-05`, `NFR-10`, `NFR-13`, `NFR-19`, `NFR-21` |
| SDD mapping | Identity and Access, Observability/Ops, Deployment Architecture, Integration Adapters, Audit/Fabric |
| Meaning of "Platform Manager" | Organization-level platform manager for one SME/financial-entity node. Not a cross-tenant SaaS super-admin unless separately specified. |

Required dashboard cards:

| Card | Required data | Primary action |
|---|---|---|
| Organization profile | legal name, registration number, deployment mode, Shariah profile completeness | Edit organization profile |
| Setup completeness | org profile, admin membership, default workspace, roles, backup, integration readiness | Continue setup |
| User and role management | active users, pending invitations, roles, missing critical roles | Invite user / assign role |
| Security/auth readiness | auth mode, OIDC status, session policy, last access-denied events | Configure auth / review denied access |
| Deployment health | API, database, Redis, object storage, worker, environment, version/commit where available | Open operations health |
| Backup and restore | last backup time, RPO/RTO status, restore-test status | Configure backup / view runbook |
| Integration readiness | ERP, Fabric, e-sign, finance API, webhooks, outbox failures | Configure integration / retry outbox |
| Evidence/audit readiness | recent audit events, pending anchors, hash mismatch count | Open audit/evidence |
| Next best actions | role-aware tasks and incomplete workflows | Jump to task |
| UAT/demo readiness | seeded data availability, demo URLs, environment warning | Open UAT scenario links in non-production |

Allowed actions:

| Action | Permission | API / route | Side effects |
|---|---|---|---|
| Edit organization profile | `admin:organization:update` | `PATCH /api/v1/orgs/:id` | `ORGANIZATION_UPDATED` |
| Invite user | `admin:invitation:create` | future invitation endpoint | `INVITATION_CREATED` |
| Assign role | `admin:membership:update` | `POST /api/v1/memberships` or future update endpoint | `MEMBERSHIP_ASSIGNED` |
| Review audit | `audit:event:read` | `/audit/search` | no mutation |
| Open deployment health | `operations:health:read` | `/operations/health` or `/dashboard` health query | optional `DEPLOYMENT_HEALTH_CHECKED` |
| Retry failed integration | `integration:outbox:retry` | future retry endpoint | `OUTBOX_RETRY_REQUESTED` |
| Confirm production readiness | `operations:readiness:confirm` | future readiness endpoint | `PRODUCTION_READINESS_CONFIRMED`; blocked until TLS/backups/auth/settings meet policy |

Acceptance criteria:

```text
- SME Admin / Platform Manager dashboard is the first protected page after organization setup.
- Dashboard distinguishes demo/prototype readiness from production readiness.
- Dashboard never grants cross-organization access unless the user has explicit membership in each organization.
- Dashboard shows next setup or business action instead of forcing the user to remember the workflow.
- Dashboard exposes degraded health, pending backups, failed outbox events, and missing security setup as actionable warnings.
```

### 26.7 Cloud entry delighter requirements

| ID | Kano type | Delighter requirement | Formula | Acceptance signal |
|---|---|---|---|---|
| `DLR-26` | Delighter | As a returning user, I didn't think to ask for zero-click routing, but because the system remembers my valid session, active organization, role, and pending tasks, I skip the landing page and land directly on the right dashboard or task queue. | A+B | User with valid session reaches `/dashboard`, `/finance/applications`, or role route without reselecting org. |
| `DLR-27` | Delighter | As a new SME Admin, I didn't think to ask for guided organization bootstrap, but because the system knows which setup items are missing, I get a checklist that turns a blank deployment into a ready node. | A+C | Dashboard setup checklist shows org, users, roles, backup, OIDC, integrations, and readiness status. |
| `DLR-28` | Delighter | As a demo operator, I didn't think to ask for cloud-server safety warnings, but because the system knows the environment, public ports, auth mode, TLS, and backup status, I know whether the server is safe for demo, UAT, or production. | B+C | Dashboard/operations page labels `DEMO`, `UAT`, or `PRODUCTION_READY_BLOCKED` with reasons. |
| `DLR-29` | Delighter | As an invited supplier/financier/reviewer, I didn't think to ask where to go after accepting an invite, but because the system maps my invitation role and workspace, it sends me directly to the scoped task. | A+B | Invite acceptance redirects supplier to RFQs, financier to due diligence queue, reviewer to Shariah tasks, auditor to evidence pack. |

### 26.8 Traceability addendum for the cloud-entry flow

| User goal | SRS mapping | UI flow | SDD component | Current contract status |
|---|---|---|---|---|
| Reach hosted MEPN node safely | `UC-01`, `NFR-19` | `/` or `/landing` with safe public entry | Deployment Architecture, Observability/Ops | Added in this section |
| Authenticate as human user | `UC-02`, `FR-02`, `IR-02`, `IR-03`, `NFR-08` | `/login` -> `/auth/callback` -> session | Identity and Access, Security Architecture | Existing + clarified |
| Register organization | `UC-01`, `FR-01`, `FR-03`, `NFR-07` | `/org/register` or `/org/setup` | Identity and Access, Data Model | Existing + clarified |
| Bind user to organization context | `FR-03`, `FR-05`, `NFR-07`, `NFR-09` | membership, role, workspace, organization switcher | Security Architecture, Data Model | Existing + clarified |
| Enter platform-manager dashboard | `UC-01`, `UC-02`, `NFR-10`, `NFR-13`, `NFR-19` | `/dashboard` setup/health/readiness | Observability/Ops, Deployment Architecture | Added in this section |
