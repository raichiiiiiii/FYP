import { describe, expect, it } from 'vitest'

import {
  buildAdminReadinessCards,
  summarizeIdentityAdmin,
} from './identityAdmin.model'
import type { Membership, Role, User } from '../../shared/types'

const users: User[] = [
  {
    id: 'user-1',
    email: 'admin@example.test',
    displayName: 'Admin',
    status: 'active',
  },
  {
    id: 'user-2',
    email: 'auditor@example.test',
    displayName: 'Auditor',
    status: 'suspended',
  },
]

const roles: Role[] = [
  {
    id: 'role-admin',
    code: 'ORG_ADMIN',
    name: 'Organization Admin',
    permissions: [{ id: 'permission-1', code: 'users:create', name: 'Create users' }],
  },
  {
    id: 'role-auditor',
    code: 'AUDITOR',
    name: 'Auditor',
    permissions: [],
  },
]

const memberships: Membership[] = [
  {
    id: 'membership-1',
    organizationId: 'org-1',
    userId: 'user-1',
    roleId: 'role-admin',
    status: 'active',
    user: users[0],
    role: roles[0],
  },
]

describe('identity admin model', () => {
  it('summarizes users, roles, memberships, and permission gaps', () => {
    const summary = summarizeIdentityAdmin({ users, roles, memberships })

    expect(summary).toMatchObject({
      totalUsers: 2,
      activeUsers: 1,
      inactiveUsers: 1,
      totalRoles: 2,
      totalMemberships: 1,
      usersWithoutMembership: 1,
      rolesWithoutPermissions: 1,
      uniquePermissionCodes: 1,
    })
    expect(summary.roleMemberCounts).toContainEqual({
      roleId: 'role-admin',
      roleName: 'Organization Admin',
      memberCount: 1,
    })
  })

  it('labels unsupported admin settings as planned or documentation-only', () => {
    const cards = buildAdminReadinessCards({
      organizationId: 'org-1',
      hasRoles: true,
      hasMemberships: false,
    })

    expect(cards.find((card) => card.id === 'organization-context')?.status).toBe(
      'backend_backed',
    )
    expect(cards.find((card) => card.id === 'data-residency')?.status).toBe(
      'documentation_only',
    )
    expect(cards.find((card) => card.id === 'feature-flags')?.status).toBe(
      'planned',
    )
  })
})
