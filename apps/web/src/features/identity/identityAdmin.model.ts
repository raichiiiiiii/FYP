import type { Membership, Role, User } from '../../shared/types'

export type IdentityAdminSummary = {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalRoles: number
  totalMemberships: number
  usersWithoutMembership: number
  rolesWithoutPermissions: number
  uniquePermissionCodes: number
  roleMemberCounts: Array<{
    roleId: string
    roleName: string
    memberCount: number
  }>
}

export type AdminReadinessCard = {
  id: string
  label: string
  value: string
  status: 'backend_backed' | 'documentation_only' | 'planned'
  description: string
}

export function summarizeIdentityAdmin({
  users,
  roles,
  memberships,
}: {
  users: User[]
  roles: Role[]
  memberships: Membership[]
}): IdentityAdminSummary {
  const activeUsers = users.filter((user) =>
    user.status.toUpperCase().includes('ACTIVE'),
  ).length
  const membershipUserIds = new Set(memberships.map((membership) => membership.userId))
  const uniquePermissionCodes = new Set(
    roles.flatMap((role) =>
      (role.permissions ?? []).map((permission) => permission.code),
    ),
  )

  return {
    totalUsers: users.length,
    activeUsers,
    inactiveUsers: users.length - activeUsers,
    totalRoles: roles.length,
    totalMemberships: memberships.length,
    usersWithoutMembership: users.filter((user) => !membershipUserIds.has(user.id))
      .length,
    rolesWithoutPermissions: roles.filter(
      (role) => !(role.permissions ?? []).length,
    ).length,
    uniquePermissionCodes: uniquePermissionCodes.size,
    roleMemberCounts: roles.map((role) => ({
      roleId: role.id,
      roleName: role.name,
      memberCount: memberships.filter(
        (membership) => membership.roleId === role.id,
      ).length,
    })),
  }
}

export function buildAdminReadinessCards({
  organizationId,
  hasRoles,
  hasMemberships,
}: {
  organizationId?: string | null
  hasRoles: boolean
  hasMemberships: boolean
}): AdminReadinessCard[] {
  return [
    {
      id: 'organization-context',
      label: 'Organization context',
      value: organizationId ? 'Backend-backed' : 'Missing',
      status: organizationId ? 'backend_backed' : 'planned',
      description: organizationId
        ? 'Users, roles, and memberships are scoped to the active organization.'
        : 'Create or select an organization before assigning memberships.',
    },
    {
      id: 'role-baseline',
      label: 'Role baseline',
      value: hasRoles ? 'Configured' : 'Needs roles',
      status: hasRoles ? 'backend_backed' : 'planned',
      description:
        'Role records and permission codes are persisted through the identity API.',
    },
    {
      id: 'membership-baseline',
      label: 'Membership baseline',
      value: hasMemberships ? 'Assigned' : 'Needs members',
      status: hasMemberships ? 'backend_backed' : 'planned',
      description:
        'Memberships bind users to organization roles and drive route access.',
    },
    {
      id: 'data-residency',
      label: 'Data residency',
      value: 'Documented only',
      status: 'documentation_only',
      description:
        'Data residency, backup region, and storage-class policy are not persisted as admin settings yet.',
    },
    {
      id: 'feature-flags',
      label: 'Feature flags',
      value: 'Planned',
      status: 'planned',
      description:
        'Feature-flag toggles from the Figma reference require a backend settings model before they can be enabled.',
    },
    {
      id: 'api-clients',
      label: 'API clients',
      value: 'Planned',
      status: 'planned',
      description:
        'API client and webhook secret management must be auditable before production use.',
    },
  ]
}

export function adminReadinessStatusLabel(
  status: AdminReadinessCard['status'],
) {
  const labels: Record<AdminReadinessCard['status'], string> = {
    backend_backed: 'Backend-backed',
    documentation_only: 'Documentation only',
    planned: 'Planned',
  }

  return labels[status]
}
