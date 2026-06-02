import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'
import { EvidenceRoute } from './evidence'
import { evidenceNavItems, isEvidencePath } from './evidence-routes'
import { FinanceRoute } from './finance'
import { financeNavItems, isFinancePath } from './finance-routes'
import { ProcurementRoute } from './procurement'
import { isProcurementPath, procurementNavItems } from './procurement-routes'

type DependencyStatus = 'ok' | 'error'

type HealthResponse = {
  status: 'ok' | 'degraded'
  service: string
  database: DependencyStatus
  redis: DependencyStatus
  environment: string
  timestamp: string
}

type Organization = {
  id: string
  legalName: string
  registrationNumber?: string | null
  deploymentMode: string
  memberships?: Membership[]
  workspaces?: Workspace[]
}

type User = {
  id: string
  email: string
  displayName: string
  status: string
}

type Role = {
  id: string
  code: string
  name: string
  description?: string | null
  permissions?: Permission[]
}

type Permission = {
  id: string
  code: string
  name: string
}

type Membership = {
  id: string
  organizationId: string
  userId: string
  roleId: string
  status: string
  user: User
  role: Role
}

type Workspace = {
  id: string
  name: string
  type: string
  status: string
}

type AuditEvent = {
  id: string
  organizationId?: string | null
  actorUserId?: string | null
  eventType: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  actorUser?: Pick<User, 'id' | 'email' | 'displayName'> | null
  organization?: Pick<Organization, 'id' | 'legalName'> | null
}

type AppSession = {
  organizationId: string | null
  actorUserId: string | null
}

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/org/setup', label: 'Org setup' },
  { path: '/admin/users', label: 'Users' },
  { path: '/admin/roles', label: 'Roles' },
  ...procurementNavItems,
  ...evidenceNavItems,
  ...financeNavItems,
  { path: '/audit', label: 'Audit' },
] as const

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

function getInitialPath() {
  return window.location.pathname === '/' ? '/dashboard' : window.location.pathname
}

function getInitialSession(): AppSession {
  const params = new URLSearchParams(window.location.search)

  return {
    organizationId:
      params.get('organizationId') || localStorage.getItem('mepn.organizationId'),
    actorUserId:
      params.get('actorUserId') || localStorage.getItem('mepn.actorUserId'),
  }
}

function statusLabel(status: DependencyStatus | HealthResponse['status']) {
  return status === 'ok' ? 'Operational' : 'Attention needed'
}

function StatusPill({
  label,
  status,
}: {
  label: string
  status: DependencyStatus | HealthResponse['status']
}) {
  return (
    <div className={`status-pill status-pill--${status}`}>
      <span aria-hidden="true" />
      <strong>{label}</strong>
      <em>{statusLabel(status)}</em>
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
  value,
  onChange,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function EmptyNotice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>
}

function Dashboard({ session }: { session: AppSession }) {
  const [healthState, setHealthState] = useState<LoadState<HealthResponse>>({
    status: 'loading',
  })
  const [organizationState, setOrganizationState] =
    useState<LoadState<Organization> | null>(
      session.organizationId ? { status: 'loading' } : null,
    )

  const healthUrl = useMemo(() => `${apiBaseUrl}/health`, [])

  const requestHealth = useCallback(
    () => apiRequest<HealthResponse>('/health'),
    [],
  )

  const requestOrganization = useCallback(() => {
    if (!session.organizationId) {
      return Promise.resolve(null)
    }

    return apiRequest<Organization>(`/orgs/${session.organizationId}`)
  }, [session.organizationId])

  async function refreshHealth() {
    setHealthState({ status: 'loading' })

    try {
      setHealthState({ status: 'ready', data: await requestHealth() })
    } catch (error) {
      setHealthState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to reach the MEPN API',
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    requestHealth()
      .then((data) => {
        if (!cancelled) {
          setHealthState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHealthState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to reach the MEPN API',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestHealth])

  useEffect(() => {
    let cancelled = false

    if (!session.organizationId) {
      return () => {
        cancelled = true
      }
    }

    requestOrganization()
      .then((data) => {
        if (!cancelled && data) {
          setOrganizationState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOrganizationState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load organization',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestOrganization, session.organizationId])

  const health = healthState.status === 'ready' ? healthState.data : null
  const organization =
    organizationState?.status === 'ready' ? organizationState.data : null

  return (
    <>
      <PageHeader
        eyebrow="MEPN local node"
        title="System health dashboard"
        action={
          <button type="button" onClick={() => void refreshHealth()}>
            Refresh
          </button>
        }
      />

      <section className="summary-band" aria-live="polite">
        {healthState.status === 'loading' ? (
          <p>Checking backend, PostgreSQL, and Redis...</p>
        ) : null}
        {healthState.status === 'error' ? (
          <p className="error-text">{healthState.message}</p>
        ) : null}
        {health ? (
          <>
            <StatusPill label="MEPN API" status={health.status} />
            <StatusPill label="PostgreSQL" status={health.database} />
            <StatusPill label="Redis" status={health.redis} />
          </>
        ) : null}
      </section>

      <section className="details-grid">
        <article>
          <span>Organization</span>
          <strong>{organization?.legalName ?? 'Not configured'}</strong>
        </article>
        <article>
          <span>Deployment mode</span>
          <strong>{organization?.deploymentMode ?? 'Pending'}</strong>
        </article>
        <article>
          <span>Admin memberships</span>
          <strong>{organization?.memberships?.length ?? 0}</strong>
        </article>
        <article>
          <span>Workspaces</span>
          <strong>{organization?.workspaces?.length ?? 0}</strong>
        </article>
        <article>
          <span>Service</span>
          <strong>{health?.service ?? 'Pending'}</strong>
        </article>
        <article>
          <span>Database status</span>
          <strong>{health?.database ?? 'Pending'}</strong>
        </article>
        <article>
          <span>Redis status</span>
          <strong>{health?.redis ?? 'Pending'}</strong>
        </article>
        <article>
          <span>Current environment</span>
          <strong>{health?.environment ?? import.meta.env.MODE}</strong>
        </article>
        <article className="wide">
          <span>API endpoint</span>
          <strong>{healthUrl}</strong>
        </article>
        <article className="wide">
          <span>Last backend timestamp</span>
          <strong>{health?.timestamp ?? 'Pending'}</strong>
        </article>
      </section>
    </>
  )
}

function OrgSetup({
  onConfigured,
}: {
  onConfigured: (session: AppSession) => void
}) {
  const [legalName, setLegalName] = useState('Example SME Sdn Bhd')
  const [registrationNumber, setRegistrationNumber] = useState('202606020001')
  const [adminName, setAdminName] = useState('Local Admin')
  const [adminEmail, setAdminEmail] = useState('admin@example.test')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const result = await apiRequest<{
        organization: Organization
        adminUser: User
      }>('/orgs', {
        method: 'POST',
        body: JSON.stringify({
          legalName,
          registrationNumber,
          deploymentMode: 'standalone_sme',
          adminUser: {
            email: adminEmail,
            displayName: adminName,
          },
        }),
      })

      const nextSession = {
        organizationId: result.organization.id,
        actorUserId: result.adminUser.id,
      }

      localStorage.setItem('mepn.organizationId', nextSession.organizationId)
      localStorage.setItem('mepn.actorUserId', nextSession.actorUserId)
      onConfigured(nextSession)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create organization',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Identity foundation" title="Organization setup" />
      <form className="form-grid" onSubmit={(event) => void submitSetup(event)}>
        <Field
          label="Legal name"
          name="legalName"
          required
          value={legalName}
          onChange={setLegalName}
        />
        <Field
          label="Registration number"
          name="registrationNumber"
          value={registrationNumber}
          onChange={setRegistrationNumber}
        />
        <Field
          label="Admin display name"
          name="adminName"
          required
          value={adminName}
          onChange={setAdminName}
        />
        <Field
          label="Admin email"
          name="adminEmail"
          type="email"
          required
          value={adminEmail}
          onChange={setAdminEmail}
        />
        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create organization'}
          </button>
          {message ? <p className="error-text">{message}</p> : null}
        </div>
      </form>
    </>
  )
}

function UsersAdmin({ session }: { session: AppSession }) {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [displayName, setDisplayName] = useState('Procurement Officer')
  const [email, setEmail] = useState('procurement@example.test')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadAdminData = useCallback(async () => {
    const [userRows, roleRows, membershipRows] = await Promise.all([
      apiRequest<User[]>('/users'),
      apiRequest<Role[]>('/roles'),
      session.organizationId
        ? apiRequest<Membership[]>(
            `/orgs/${session.organizationId}/memberships`,
          )
        : Promise.resolve([]),
    ])

    return { userRows, roleRows, membershipRows }
  }, [session.organizationId])

  const applyAdminData = useCallback(
    (data: {
      userRows: User[]
      roleRows: Role[]
      membershipRows: Membership[]
    }) => {
      setUsers(data.userRows)
      setRoles(data.roleRows)
      setMemberships(data.membershipRows)
      setSelectedUserId(data.userRows[0]?.id ?? '')
      setSelectedRoleId(data.roleRows[0]?.id ?? '')
    },
    [],
  )

  async function refresh() {
    try {
      applyAdminData(await loadAdminData())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load users')
    }
  }

  useEffect(() => {
    let cancelled = false

    loadAdminData()
      .then((data) => {
        if (!cancelled) {
          applyAdminData(data)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load users',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [applyAdminData, loadAdminData])

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          displayName,
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
        }),
      })
      await refresh()
      setMessage('User created')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create user')
    }
  }

  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!session.organizationId) {
      setMessage('Create an organization first')
      return
    }

    try {
      await apiRequest<Membership>('/memberships', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: session.organizationId,
          userId: selectedUserId,
          roleId: selectedRoleId,
          actorUserId: session.actorUserId,
        }),
      })
      await refresh()
      setMessage('Role assigned')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to assign role')
    }
  }

  return (
    <>
      <PageHeader eyebrow="Identity and access" title="Users and memberships" />
      <section className="split-grid">
        <form className="form-grid" onSubmit={(event) => void createUser(event)}>
          <h2>Create user</h2>
          <Field
            label="Display name"
            name="displayName"
            required
            value={displayName}
            onChange={setDisplayName}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            value={email}
            onChange={setEmail}
          />
          <div className="form-actions">
            <button type="submit">Create user</button>
          </div>
        </form>

        <form className="form-grid" onSubmit={(event) => void assignRole(event)}>
          <h2>Assign role</h2>
          <label className="field">
            <span>User</span>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Role</span>
            <select
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" disabled={!users.length || !roles.length}>
              Assign role
            </button>
          </div>
        </form>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="table-section">
        <h2>Memberships</h2>
        {memberships.length ? (
          <div className="data-table">
            {memberships.map((membership) => (
              <article key={membership.id}>
                <strong>{membership.user.displayName}</strong>
                <span>{membership.user.email}</span>
                <span>{membership.role.name}</span>
                <span>{membership.status}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No memberships found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function RolesAdmin({ session }: { session: AppSession }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [code, setCode] = useState('PROCUREMENT_OFFICER')
  const [name, setName] = useState('Procurement Officer')
  const [description, setDescription] = useState('Runs sourcing and P2P tasks')
  const [permissionCodes, setPermissionCodes] = useState(
    'PROCUREMENT_READ,PROCUREMENT_WRITE',
  )
  const [message, setMessage] = useState<string | null>(null)

  const loadRoles = useCallback(() => apiRequest<Role[]>('/roles'), [])

  useEffect(() => {
    let cancelled = false

    loadRoles()
      .then((rows) => {
        if (!cancelled) {
          setRoles(rows)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Unable to load roles',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRoles])

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiRequest<Role>('/roles', {
        method: 'POST',
        body: JSON.stringify({
          code,
          name,
          description,
          permissionCodes: permissionCodes
            .split(',')
            .map((permission) => permission.trim())
            .filter(Boolean),
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
        }),
      })
      setRoles(await loadRoles())
      setMessage('Role created')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create role')
    }
  }

  return (
    <>
      <PageHeader eyebrow="Permission checks" title="Roles" />
      <form className="form-grid" onSubmit={(event) => void createRole(event)}>
        <Field label="Code" name="code" required value={code} onChange={setCode} />
        <Field label="Name" name="name" required value={name} onChange={setName} />
        <Field
          label="Description"
          name="description"
          value={description}
          onChange={setDescription}
        />
        <Field
          label="Permission codes"
          name="permissionCodes"
          value={permissionCodes}
          onChange={setPermissionCodes}
        />
        <div className="form-actions">
          <button type="submit">Create role</button>
          {message ? <p className="notice">{message}</p> : null}
        </div>
      </form>

      <section className="table-section">
        <h2>Current roles</h2>
        {roles.length ? (
          <div className="data-table">
            {roles.map((role) => (
              <article key={role.id}>
                <strong>{role.name}</strong>
                <span>{role.code}</span>
                <span>
                  {(role.permissions || [])
                    .map((permission) => permission.code)
                    .join(', ') || 'No permissions'}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyNotice>No roles found.</EmptyNotice>
        )}
      </section>
    </>
  )
}

function AuditScreen({ session }: { session: AppSession }) {
  const [state, setState] = useState<LoadState<AuditEvent[]>>({
    status: 'loading',
  })

  const loadAuditEvents = useCallback(() => {
    const query = session.organizationId
      ? `?organizationId=${encodeURIComponent(session.organizationId)}`
      : ''
    return apiRequest<AuditEvent[]>(`/audit-events${query}`)
  }, [session.organizationId])

  useEffect(() => {
    let cancelled = false

    loadAuditEvents()
      .then((rows) => {
        if (!cancelled) {
          setState({ status: 'ready', data: rows })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Unable to load audit',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadAuditEvents])

  return (
    <>
      <PageHeader eyebrow="Audit context" title="Audit events" />
      {state.status === 'loading' ? <EmptyNotice>Loading audit...</EmptyNotice> : null}
      {state.status === 'error' ? (
        <p className="error-text">{state.message}</p>
      ) : null}
      {state.status === 'ready' ? (
        <section className="table-section">
          {state.data.length ? (
            <div className="data-table data-table--audit">
              {state.data.map((event) => (
                <article key={event.id}>
                  <strong>{event.eventType}</strong>
                  <span>{event.entityType ?? 'System'}</span>
                  <span>{event.actorUser?.displayName ?? 'System'}</span>
                  <span>{new Date(event.createdAt).toLocaleString()}</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyNotice>No audit events found.</EmptyNotice>
          )}
        </section>
      ) : null}
    </>
  )
}

function App() {
  const [path, setPath] = useState(getInitialPath)
  const [session, setSession] = useState<AppSession>(getInitialSession)

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }, [])

  const configureSession = useCallback(
    (nextSession: AppSession) => {
      setSession(nextSession)
      navigate('/dashboard')
    },
    [navigate],
  )

  useEffect(() => {
    const handlePopState = () => setPath(getInitialPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <strong>MEPN</strong>
        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={path === item.path ? 'nav-item active' : 'nav-item'}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content-shell">
        {path === '/org/setup' ? (
          <OrgSetup onConfigured={configureSession} />
        ) : null}
        {path === '/admin/users' ? <UsersAdmin session={session} /> : null}
        {path === '/admin/roles' ? <RolesAdmin session={session} /> : null}
        {isProcurementPath(path) ? (
          <ProcurementRoute
            path={path}
            session={session}
            navigate={navigate}
          />
        ) : null}
        {isEvidencePath(path) ? (
          <EvidenceRoute path={path} session={session} />
        ) : null}
        {isFinancePath(path) ? (
          <FinanceRoute path={path} session={session} navigate={navigate} />
        ) : null}
        {path === '/audit' ? <AuditScreen session={session} /> : null}
        {path !== '/org/setup' &&
        path !== '/admin/users' &&
        path !== '/admin/roles' &&
        !isProcurementPath(path) &&
        !isEvidencePath(path) &&
        !isFinancePath(path) &&
        path !== '/audit' ? (
          <Dashboard session={session} />
        ) : null}
      </main>
    </div>
  )
}

export default App
