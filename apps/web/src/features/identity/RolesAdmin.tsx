import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { useAppSession } from '../../app/session'
import { PageHeader } from '../../layouts/PageHeader'
import { apiRequest } from '../../shared/api/client'
import { getErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/components/Button'
import { DataTable } from '../../shared/components/DataTable'
import { EmptyState } from '../../shared/components/EmptyState'
import { ErrorState } from '../../shared/components/ErrorState'
import { FormField } from '../../shared/components/FormField'
import { LoadingState } from '../../shared/components/LoadingState'
import { useValidatedForm } from '../../shared/forms/useValidatedForm'
import { useToast } from '../../shared/toast/useToast'
import type { Role } from '../../shared/types'
import { adminReadinessStatusLabel } from './identityAdmin.model'

const roleSchema = z.object({
  code: z.string().trim().min(1, 'Role code is required.'),
  name: z.string().trim().min(1, 'Role name is required.'),
  description: z.string().trim().optional(),
  permissionCodes: z.string().trim().optional(),
})

export function RolesAdmin() {
  const { session } = useAppSession()
  const { notify } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const roleForm = useValidatedForm(roleSchema, {
    defaultValues: {
      code: 'PROCUREMENT_OFFICER',
      name: 'Procurement Officer',
      description: 'Runs sourcing and P2P tasks',
      permissionCodes: 'PROCUREMENT_READ,PROCUREMENT_WRITE',
    },
  })
  const roleMetrics = useMemo(() => {
    const permissionCodes = new Set(
      roles.flatMap((role) =>
        (role.permissions ?? []).map((permission) => permission.code),
      ),
    )

    return {
      totalRoles: roles.length,
      uniquePermissionCodes: permissionCodes.size,
      rolesWithoutPermissions: roles.filter(
        (role) => !(role.permissions ?? []).length,
      ).length,
    }
  }, [roles])

  const loadRoles = useCallback(
    () =>
      apiRequest<Role[]>(
        `/roles?${new URLSearchParams({
          organizationId: session.organizationId ?? '',
          actorUserId: session.actorUserId ?? '',
        }).toString()}`,
      ),
    [session.actorUserId, session.organizationId],
  )

  useEffect(() => {
    let cancelled = false

    loadRoles()
      .then((rows) => {
        if (!cancelled) {
          setRoles(rows)
          setLoading(false)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(getErrorMessage(error, 'Unable to load roles'))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRoles])

  const createRole = roleForm.handleSubmit(async (values) => {
    setMessage(null)

    try {
      await apiRequest<Role>('/roles', {
        method: 'POST',
        body: JSON.stringify({
          code: values.code,
          name: values.name,
          description: values.description,
          permissionCodes: (values.permissionCodes ?? '')
            .split(',')
            .map((permission) => permission.trim())
            .filter(Boolean),
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
        }),
      })
      setRoles(await loadRoles())
      notify({ type: 'success', message: 'Role created' })
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Unable to create role')
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  return (
    <>
      <PageHeader eyebrow="Identity and access" title="Roles and permissions" />

      <section className="admin-hero" aria-label="Role administration overview">
        <div>
          <span>Permission baseline</span>
          <h2>Reusable roles for scoped module access</h2>
          <p>
            Roles and permission codes are persisted through the identity API.
            Permission semantics should stay aligned with route metadata and
            backend guards.
          </p>
        </div>
        <div className="admin-hero-status">
          <strong>
            {roleMetrics.rolesWithoutPermissions
              ? `${roleMetrics.rolesWithoutPermissions} role(s) need permissions`
              : 'Permission baseline defined'}
          </strong>
          <p>
            Editing, deleting, and privilege escalation workflows are deferred
            until audit and approval rules are explicit.
          </p>
        </div>
      </section>

      <section className="details-grid admin-overview-grid">
        <article>
          <span>Roles defined</span>
          <strong>{roleMetrics.totalRoles}</strong>
        </article>
        <article>
          <span>Permission codes</span>
          <strong>{roleMetrics.uniquePermissionCodes}</strong>
        </article>
        <article>
          <span>Roles without permissions</span>
          <strong>{roleMetrics.rolesWithoutPermissions}</strong>
        </article>
        <article>
          <span>Mutation coverage</span>
          <strong>Create only</strong>
        </article>
      </section>

      <section className="admin-readiness-grid" aria-label="Role readiness notes">
        <article>
          <span>Backend model</span>
          <strong>Role + permissions</strong>
          <small className="admin-readiness-status admin-readiness-status--backend_backed">
            {adminReadinessStatusLabel('backend_backed')}
          </small>
          <p>Role creation is API-backed and scoped by organization input.</p>
        </article>
        <article>
          <span>Role changes</span>
          <strong>Approval needed</strong>
          <small className="admin-readiness-status admin-readiness-status--planned">
            {adminReadinessStatusLabel('planned')}
          </small>
          <p>
            Editing or removing roles should be audited and checked against
            active memberships before implementation.
          </p>
        </article>
        <article>
          <span>Permission matrix</span>
          <strong>Route metadata</strong>
          <small className="admin-readiness-status admin-readiness-status--documentation_only">
            {adminReadinessStatusLabel('documentation_only')}
          </small>
          <p>
            The UI reflects current route metadata; backend mutation guards must
            remain authoritative.
          </p>
        </article>
      </section>

      <form
        className="form-grid"
        noValidate
        onSubmit={(event) => void createRole(event)}
      >
        <h2>Create role</h2>
        <p className="form-support-copy">
          Creates a role with comma-separated permission codes. Use explicit
          codes from the route and backend permission matrix.
        </p>
        <FormField
          label="Code"
          name="code"
          required
          registration={roleForm.register('code')}
          error={roleForm.formState.errors.code?.message}
        />
        <FormField
          label="Name"
          name="name"
          required
          registration={roleForm.register('name')}
          error={roleForm.formState.errors.name?.message}
        />
        <FormField
          label="Description"
          name="description"
          registration={roleForm.register('description')}
          error={roleForm.formState.errors.description?.message}
        />
        <FormField
          label="Permission codes"
          name="permissionCodes"
          registration={roleForm.register('permissionCodes')}
          error={roleForm.formState.errors.permissionCodes?.message}
        />
        <div className="form-actions">
          <Button type="submit" disabled={roleForm.formState.isSubmitting}>
            Create role
          </Button>
        </div>
      </form>

      {message ? <ErrorState title="Role action failed" message={message} /> : null}

      <section className="table-section">
        <h2>Current roles</h2>
        {loading ? (
          <LoadingState message="Loading roles..." />
        ) : roles.length ? (
          <DataTable
            rows={roles}
            getRowKey={(role) => role.id}
            emptyTitle="No roles found"
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (role) => role.name,
              },
              {
                key: 'code',
                header: 'Code',
                render: (role) => role.code,
              },
              {
                key: 'permissions',
                header: 'Permissions',
                render: (role) =>
                  (role.permissions || [])
                    .map((permission) => permission.code)
                    .join(', ') || 'No permissions',
              },
            ]}
          />
        ) : (
          <EmptyState title="No roles found">
            Create roles to control access to MEPN modules.
          </EmptyState>
        )}
      </section>
    </>
  )
}
