import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { routeMetadata } from '../../app/navigation'
import { useAppSession } from '../../app/session'
import { PageHeader } from '../../layouts/PageHeader'
import { apiRequest } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { getErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/components/Button'
import { DataTable } from '../../shared/components/DataTable'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { FormField } from '../../shared/components/FormField'
import { LoadingState } from '../../shared/components/LoadingState'
import { SelectField } from '../../shared/components/SelectField'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { useValidatedForm } from '../../shared/forms/useValidatedForm'
import { useToast } from '../../shared/toast/useToast'
import type {
  Membership,
  Role,
  User,
  UserNavigationOverridesResponse,
} from '../../shared/types'
import {
  adminReadinessStatusLabel,
  buildAdminReadinessCards,
  summarizeIdentityAdmin,
} from './identityAdmin.model'

const createUserSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  selectedRoleId: z.string().trim().min(1, 'Select an initial role.'),
})

const assignRoleSchema = z.object({
  selectedUserId: z.string().trim().min(1, 'Select a user.'),
  selectedRoleId: z.string().trim().min(1, 'Select a role.'),
})

export function UsersAdmin() {
  const { session } = useAppSession()
  const { notify } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [selectedNavigationUserId, setSelectedNavigationUserId] = useState('')
  const [navigationOverrides, setNavigationOverrides] = useState<
    Record<string, boolean>
  >({})
  const [navigationLoading, setNavigationLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const createUserForm = useValidatedForm(createUserSchema, {
    defaultValues: {
      displayName: 'Procurement Officer',
      email: 'procurement@example.test',
      selectedRoleId: '',
    },
  })
  const assignRoleForm = useValidatedForm(assignRoleSchema, {
    defaultValues: {
      selectedUserId: '',
      selectedRoleId: '',
    },
  })
  const summary = useMemo(
    () => summarizeIdentityAdmin({ users, roles, memberships }),
    [memberships, roles, users],
  )
  const readinessCards = useMemo(
    () =>
      buildAdminReadinessCards({
        organizationId: session.organizationId,
        hasRoles: roles.length > 0,
        hasMemberships: memberships.length > 0,
      }),
    [memberships.length, roles.length, session.organizationId],
  )
  const sidebarRoutes = useMemo(
    () => routeMetadata.filter((route) => route.showInSidebar),
    [],
  )
  const selectedNavigationUser = users.find(
    (user) => user.id === selectedNavigationUserId,
  )

  const loadAdminData = useCallback(async () => {
    const identityScope = buildIdentityScopeQuery({
      organizationId: session.organizationId,
      actorUserId: session.actorUserId,
    })
    const [userRows, roleRows, membershipRows] = await Promise.all([
      apiRequest<User[]>(`/users?${identityScope}`),
      apiRequest<Role[]>(`/roles?${identityScope}`),
      session.organizationId
        ? apiRequest<Membership[]>(
            `/orgs/${session.organizationId}/memberships?${new URLSearchParams(
              {
                actorUserId: session.actorUserId ?? '',
              },
            ).toString()}`,
          )
        : Promise.resolve([]),
    ])

    return { userRows, roleRows, membershipRows }
  }, [session.actorUserId, session.organizationId])

  const applyAdminData = useCallback(
    (data: {
      userRows: User[]
      roleRows: Role[]
      membershipRows: Membership[]
    }) => {
      setUsers(data.userRows)
      setRoles(data.roleRows)
      setMemberships(data.membershipRows)
      createUserForm.setValue('selectedRoleId', data.roleRows[0]?.id ?? '')
      assignRoleForm.setValue('selectedUserId', data.userRows[0]?.id ?? '')
      assignRoleForm.setValue('selectedRoleId', data.roleRows[0]?.id ?? '')
      setSelectedNavigationUserId((current) =>
        current && data.userRows.some((user) => user.id === current)
          ? current
          : data.userRows[0]?.id ?? '',
      )
    },
    [assignRoleForm, createUserForm],
  )

  async function refresh() {
    try {
      applyAdminData(await loadAdminData())
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load users'))
    }
  }

  useEffect(() => {
    let cancelled = false

    loadAdminData()
      .then((data) => {
        if (!cancelled) {
          applyAdminData(data)
          setLoading(false)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(getErrorMessage(error, 'Unable to load users'))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [applyAdminData, loadAdminData])

  const createUser = createUserForm.handleSubmit(async (values) => {
    setMessage(null)

    try {
      await apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: values.email,
          displayName: values.displayName,
          roleId: values.selectedRoleId,
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
        }),
      })
      await refresh()
      notify({ type: 'success', message: 'User created' })
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Unable to create user')
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  const assignRole = assignRoleForm.handleSubmit(async (values) => {
    if (!session.organizationId) {
      setMessage('Create an organization first')
      return
    }

    try {
      await apiRequest<Membership>('/memberships', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: session.organizationId,
          userId: values.selectedUserId,
          roleId: values.selectedRoleId,
          actorUserId: session.actorUserId,
        }),
      })
      await refresh()
      notify({ type: 'success', message: 'Role assigned' })
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Unable to assign role')
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  const loadNavigationOverrides = useCallback(
    async (userId: string) => {
      if (!session.organizationId || !session.actorUserId || !userId) {
        setNavigationOverrides({})
        return
      }

      try {
        setNavigationLoading(true)
        const response = await apiRequest<UserNavigationOverridesResponse>(
          endpoints.navigationOverrides.user(
            userId,
            session.organizationId,
            session.actorUserId,
          ),
        )
        setNavigationOverrides(
          Object.fromEntries(
            response.overrides.map((override) => [
              override.routePath,
              override.visible,
            ]),
          ),
        )
      } catch (error) {
        const errorMessage = getErrorMessage(
          error,
          'Unable to load sidebar access',
        )
        setMessage(errorMessage)
      } finally {
        setNavigationLoading(false)
      }
    },
    [session.actorUserId, session.organizationId],
  )

  useEffect(() => {
    if (!selectedNavigationUserId) {
      return undefined
    }

    const timeoutId = window.setTimeout(
      () => void loadNavigationOverrides(selectedNavigationUserId),
      0,
    )

    return () => window.clearTimeout(timeoutId)
  }, [loadNavigationOverrides, selectedNavigationUserId])

  function toggleNavigationRoute(routePath: string) {
    setNavigationOverrides((current) => ({
      ...current,
      [routePath]: !(current[routePath] ?? true),
    }))
  }

  async function saveNavigationOverrides() {
    if (!session.organizationId || !session.actorUserId || !selectedNavigationUserId) {
      setMessage('Select an organization user before saving sidebar access.')
      return
    }

    try {
      setMessage(null)
      const response = await apiRequest<UserNavigationOverridesResponse>(
        endpoints.navigationOverrides.user(
          selectedNavigationUserId,
          session.organizationId,
          session.actorUserId,
        ),
        {
          method: 'PATCH',
          body: {
            organizationId: session.organizationId,
            actorUserId: session.actorUserId,
            overrides: sidebarRoutes.map((route) => ({
              routePath: route.path,
              visible: navigationOverrides[route.path] ?? true,
            })),
          },
        },
      )
      setNavigationOverrides(
        Object.fromEntries(
          response.overrides.map((override) => [
            override.routePath,
            override.visible,
          ]),
        ),
      )
      notify({ type: 'success', message: 'Sidebar access saved' })
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        'Unable to save sidebar access',
      )
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  }

  return (
    <>
      <PageHeader eyebrow="Administration" title="Users and memberships" />

      <section className="admin-hero" aria-label="Administration overview">
        <div>
          <span>Identity and access</span>
          <h2>Organization-scoped access control</h2>
          <p>
            Users, roles, and memberships are backend-backed. Data residency,
            feature flags, invitations, and API clients remain planned settings
            until their audited backend models exist.
          </p>
        </div>
        <div className="admin-hero-status">
          <strong>
            {summary.usersWithoutMembership
              ? `${summary.usersWithoutMembership} user(s) need membership`
              : 'Membership baseline assigned'}
          </strong>
          <p>
            Route visibility is driven by session role and permission claims.
            Backend authorization remains the source of truth for mutations.
          </p>
        </div>
      </section>

      <section className="details-grid admin-overview-grid">
        <article>
          <span>Total users</span>
          <strong>{summary.totalUsers}</strong>
        </article>
        <article>
          <span>Active users</span>
          <strong>{summary.activeUsers}</strong>
        </article>
        <article>
          <span>Roles defined</span>
          <strong>{summary.totalRoles}</strong>
        </article>
        <article>
          <span>Memberships</span>
          <strong>{summary.totalMemberships}</strong>
        </article>
        <article>
          <span>Permission codes</span>
          <strong>{summary.uniquePermissionCodes}</strong>
        </article>
        <article>
          <span>Unassigned users</span>
          <strong>{summary.usersWithoutMembership}</strong>
        </article>
      </section>

      <section className="admin-readiness-grid" aria-label="Administration readiness">
        {readinessCards.map((card) => (
          <article key={card.id}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small
              className={`admin-readiness-status admin-readiness-status--${card.status}`}
            >
              {adminReadinessStatusLabel(card.status)}
            </small>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section className="split-grid">
        <form
          className="form-grid"
          noValidate
          onSubmit={(event) => void createUser(event)}
        >
          <h2>Create user</h2>
          <p className="form-support-copy">
            Creates a local user record for the active organization context.
            Invitation acceptance and OIDC provisioning remain separate planned
            flows.
          </p>
          <FormField
            label="Display name"
            name="displayName"
            required
            registration={createUserForm.register('displayName')}
            error={createUserForm.formState.errors.displayName?.message}
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            required
            registration={createUserForm.register('email')}
            error={createUserForm.formState.errors.email?.message}
          />
          <SelectField
            label="Initial role"
            name="selectedRoleId"
            registration={createUserForm.register('selectedRoleId')}
            error={createUserForm.formState.errors.selectedRoleId?.message}
            options={roles.map((role) => ({
              value: role.id,
              label: role.name,
            }))}
          />
          <div className="form-actions">
            <Button
              type="submit"
              disabled={!roles.length || createUserForm.formState.isSubmitting}
            >
              Create user
            </Button>
          </div>
        </form>

        <form
          className="form-grid"
          noValidate
          onSubmit={(event) => void assignRole(event)}
        >
          <h2>Assign role</h2>
          <p className="form-support-copy">
            Assigns a backend membership record. Destructive membership changes
            are not exposed in this demo surface.
          </p>
          <SelectField
            label="User"
            name="selectedUserId"
            registration={assignRoleForm.register('selectedUserId')}
            error={assignRoleForm.formState.errors.selectedUserId?.message}
            options={users.map((user) => ({
              value: user.id,
              label: `${user.displayName} (${user.email})`,
            }))}
          />
          <SelectField
            label="Role"
            name="selectedRoleId"
            registration={assignRoleForm.register('selectedRoleId')}
            error={assignRoleForm.formState.errors.selectedRoleId?.message}
            options={roles.map((role) => ({
              value: role.id,
              label: role.name,
            }))}
          />
          <div className="form-actions">
            <Button
              type="submit"
              disabled={
                !users.length ||
                !roles.length ||
                assignRoleForm.formState.isSubmitting
              }
            >
              Assign role
            </Button>
          </div>
        </form>
      </section>

      {message ? <ErrorState title="Identity action failed" message={message} /> : null}

      <section className="table-section">
        <h2>Memberships</h2>
        {loading ? (
          <LoadingState message="Loading memberships..." />
        ) : memberships.length ? (
          <DataTable
            rows={memberships}
            getRowKey={(membership) => membership.id}
            emptyTitle="No memberships found"
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (membership) => membership.user.displayName,
              },
              {
                key: 'email',
                header: 'Email',
                render: (membership) => membership.user.email,
              },
              {
                key: 'role',
                header: 'Role',
                render: (membership) => membership.role.name,
              },
              {
                key: 'status',
                header: 'Status',
                render: (membership) => (
                  <StatusBadge status={membership.status} />
                ),
              },
            ]}
          />
        ) : (
          <EmptyState title="No memberships found">
            Create users and assign roles to build organization access.
          </EmptyState>
        )}
      </section>

      <section className="table-section" aria-labelledby="sidebar-access-title">
        <div className="section-heading-row">
          <div>
            <h2 id="sidebar-access-title">Sidebar access</h2>
            <p>
              Hide or show left-panel items for a same-organization user. This
              does not grant route permissions or bypass backend authorization.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void saveNavigationOverrides()}
            disabled={!selectedNavigationUserId || navigationLoading}
          >
            Save sidebar access
          </Button>
        </div>

        {users.length ? (
          <>
            <SelectField
              label="User"
              name="sidebarUserId"
              value={selectedNavigationUserId}
              onChange={(event) =>
                setSelectedNavigationUserId(event.currentTarget.value)
              }
              options={users.map((user) => ({
                value: user.id,
                label: `${user.displayName} (${user.email})`,
              }))}
            />
            {selectedNavigationUser ? (
              <p className="form-support-copy">
                Editing sidebar items for {selectedNavigationUser.displayName}.
                Organization admins keep full sidebar access by default.
              </p>
            ) : null}
            <div className="sidebar-access-grid">
              {sidebarRoutes.map((route) => {
                const visible = navigationOverrides[route.path] ?? true

                return (
                  <label key={route.path} className="sidebar-access-item">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => toggleNavigationRoute(route.path)}
                    />
                    <span>
                      <strong>{route.label}</strong>
                      <small>
                        {route.module} · {route.path}
                      </small>
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        ) : (
          <EmptyState title="No organization users found">
            Create users before configuring sidebar access.
          </EmptyState>
        )}
      </section>
    </>
  )
}

function buildIdentityScopeQuery({
  organizationId,
  actorUserId,
}: {
  organizationId?: string | null
  actorUserId?: string | null
}) {
  return new URLSearchParams({
    organizationId: organizationId ?? '',
    actorUserId: actorUserId ?? '',
  }).toString()
}
