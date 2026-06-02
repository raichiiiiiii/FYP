import { RbacService } from '../../../src/modules/identity/rbac.service';

describe('FR-03 Identity / RBAC unit rules', () => {
  const service = new RbacService();

  it('allows an organization admin to create users', () => {
    expect(
      service.canCreateUsers({
        userId: 'admin-1',
        roleCode: 'ORG_ADMIN',
      }),
    ).toBe(true);
  });

  it('prevents a procurement officer from approving a requisition', () => {
    expect(
      service.canApproveRequisition(
        {
          userId: 'requester-1',
          roleCode: 'PROCUREMENT_OFFICER',
        },
        {
          requesterUserId: 'requester-1',
          segregationRequired: true,
        },
      ),
    ).toBe(false);
  });

  it('prevents an approver from approving their own requisition when segregation applies', () => {
    expect(
      service.canApproveRequisition(
        {
          userId: 'approver-1',
          roleCode: 'APPROVER',
        },
        {
          requesterUserId: 'approver-1',
          segregationRequired: true,
        },
      ),
    ).toBe(false);
  });

  it('allows a financier user to access only assigned workspaces', () => {
    const actor = {
      userId: 'financier-1',
      roleCode: 'FINANCIER_USER' as const,
      workspaceIds: ['workspace-1'],
    };

    expect(service.canAccessWorkspace(actor, 'workspace-1')).toBe(true);
    expect(service.canAccessWorkspace(actor, 'workspace-2')).toBe(false);
  });

  it('keeps auditor access read-only', () => {
    const actor = {
      userId: 'auditor-1',
      roleCode: 'AUDITOR' as const,
    };

    expect(service.hasPermission(actor, 'audit:read')).toBe(true);
    expect(service.canMutate(actor, 'procurement:create')).toBe(false);
  });
});
