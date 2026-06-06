import { Injectable } from '@nestjs/common';

export type ActorRole =
  | 'ORG_ADMIN'
  | 'PROCUREMENT_OFFICER'
  | 'APPROVER'
  | 'FINANCIER_USER'
  | 'SHARIAH_REVIEWER'
  | 'AUDITOR'
  | 'FABRIC_GOVERNANCE_ADMIN'
  | 'PLATFORM_OPERATOR';

export type Permission =
  | 'users:create'
  | 'procurement:create'
  | 'procurement:approve'
  | 'finance:review'
  | 'shariah:review'
  | 'audit:read'
  | 'fabric:governance'
  | 'fabric:operate';

export type ActorContext = {
  userId: string;
  roleCode: ActorRole;
  workspaceIds?: string[];
};

export type RequisitionApprovalContext = {
  requesterUserId?: string | null;
  segregationRequired?: boolean;
};

const rolePermissions: Record<ActorRole, Permission[]> = {
  ORG_ADMIN: [
    'users:create',
    'procurement:create',
    'procurement:approve',
    'finance:review',
    'shariah:review',
    'audit:read',
    'fabric:governance',
  ],
  PROCUREMENT_OFFICER: ['procurement:create', 'audit:read'],
  APPROVER: ['procurement:approve', 'audit:read'],
  FINANCIER_USER: ['finance:review', 'audit:read'],
  SHARIAH_REVIEWER: ['shariah:review', 'audit:read'],
  AUDITOR: ['audit:read'],
  FABRIC_GOVERNANCE_ADMIN: ['audit:read', 'fabric:governance'],
  PLATFORM_OPERATOR: ['audit:read', 'fabric:operate'],
};

@Injectable()
export class RbacService {
  hasPermission(actor: ActorContext, permission: Permission) {
    return rolePermissions[actor.roleCode]?.includes(permission) ?? false;
  }

  canCreateUsers(actor: ActorContext) {
    return this.hasPermission(actor, 'users:create');
  }

  canApproveRequisition(
    actor: ActorContext,
    requisition: RequisitionApprovalContext,
  ) {
    if (!this.hasPermission(actor, 'procurement:approve')) {
      return false;
    }

    if (
      requisition.segregationRequired &&
      requisition.requesterUserId === actor.userId
    ) {
      return false;
    }

    return true;
  }

  canAccessWorkspace(actor: ActorContext, workspaceId: string) {
    if (actor.roleCode === 'ORG_ADMIN' || actor.roleCode === 'AUDITOR') {
      return true;
    }

    return actor.workspaceIds?.includes(workspaceId) ?? false;
  }

  canMutate(actor: ActorContext, permission: Permission) {
    return (
      actor.roleCode !== 'AUDITOR' && this.hasPermission(actor, permission)
    );
  }
}
