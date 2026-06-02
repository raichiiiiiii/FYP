import { useCallback, useEffect, useState } from 'react'
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

  const loadRoles = useCallback(() => apiRequest<Role[]>('/roles'), [])

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
      <PageHeader eyebrow="Permission checks" title="Roles" />
      <form className="form-grid" noValidate onSubmit={(event) => void createRole(event)}>
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
