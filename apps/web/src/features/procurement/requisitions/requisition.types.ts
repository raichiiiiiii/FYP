import type { AppRoleCode } from '../../../shared/types'

export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'sourcing'
  | 'converted_to_po'
  | 'cancelled'

export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'partially_received'
  | 'received'
  | 'billed'
  | 'completed'
  | 'cancelled'
  | 'closed'

export type UserSummary = {
  id: string
  email?: string | null
  displayName?: string | null
}

export type ProcurementProjectOption = {
  id: string
  name: string
  code?: string | null
  budget?: number | string | null
}

export type RequisitionItemRecord = {
  id?: string
  description: string
  category?: string | null
  quantity: number | string
  unitPrice: number | string
}

export type ApprovalRequestRecord = {
  id: string
  approverUserId?: string | null
  status: string
  decision?: string | null
  comment?: string | null
  approverUser?: UserSummary | null
}

export type RequisitionRecord = {
  id: string
  organizationId?: string
  projectId?: string | null
  requesterUserId?: string | null
  title: string
  justification?: string | null
  status: string
  totalAmount: number | string
  createdAt?: string
  submittedAt?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  project?: ProcurementProjectOption | null
  requesterUser?: UserSummary | null
  items?: RequisitionItemRecord[]
  approvalRequests?: ApprovalRequestRecord[]
}

export type CreateRequisitionFormValues = {
  projectId: string
  title: string
  department: string
  neededBy: string
  justification: string
  itemDescription: string
  itemCategory: string
  quantity: string
  unitPrice: string
}

export type CreateRequisitionValidationResult = {
  ok: boolean
  errors: Partial<Record<keyof CreateRequisitionFormValues | 'form', string>>
}

export type RequisitionSummary = {
  total: number
  draft: number
  submitted: number
  approved: number
  rejected: number
  totalValue: number
}

export type ApprovalActionState = {
  canApprove: boolean
  canReject: boolean
  reason?: string
}

export type RequisitionAction = 'submit' | 'approve' | 'reject'

export type RoleDecision = {
  roleCodes: readonly AppRoleCode[]
  actorUserId?: string | null
}
