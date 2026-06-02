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
import { SelectField } from '../../shared/components/SelectField'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { useValidatedForm } from '../../shared/forms/useValidatedForm'
import { useToast } from '../../shared/toast/useToast'
import type { Membership, Role, User } from '../../shared/types'

const createUserSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
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
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const createUserForm = useValidatedForm(createUserSchema, {
    defaultValues: {
      displayName: 'Procurement Officer',
      email: 'procurement@example.test',
    },
  })
  const assignRoleForm = useValidatedForm(assignRoleSchema, {
    defaultValues: {
      selectedUserId: '',
      selectedRoleId: '',
    },
  })

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
      assignRoleForm.setValue('selectedUserId', data.userRows[0]?.id ?? '')
      assignRoleForm.setValue('selectedRoleId', data.roleRows[0]?.id ?? '')
    },
    [assignRoleForm],
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

  return (
    <>
      <PageHeader eyebrow="Identity and access" title="Users and memberships" />
      <section className="split-grid">
      <form className="form-grid" noValidate onSubmit={(event) => void createUser(event)}>
          <h2>Create user</h2>
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
          <div className="form-actions">
            <Button type="submit" disabled={createUserForm.formState.isSubmitting}>
              Create user
            </Button>
          </div>
        </form>

      <form className="form-grid" noValidate onSubmit={(event) => void assignRole(event)}>
          <h2>Assign role</h2>
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
    </>
  )
}
