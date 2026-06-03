import type { AppRoleCode } from '../../../shared/types'
import type {
  ApprovalActionState,
  CreateRequisitionFormValues,
  CreateRequisitionValidationResult,
  RequisitionRecord,
  RequisitionStatus,
  RequisitionSummary,
} from './requisition.types'

const createRoles = new Set<AppRoleCode>(['ORG_ADMIN', 'PROCUREMENT_OFFICER'])
const approveRoles = new Set<AppRoleCode>(['ORG_ADMIN', 'APPROVER'])

const statusMap: Record<string, RequisitionStatus> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SOURCING: 'sourcing',
  CONVERTED_TO_PO: 'converted_to_po',
  PO_ISSUED: 'converted_to_po',
  CANCELLED: 'cancelled',
}

export function normalizeRequisitionStatus(
  status?: string | null,
): RequisitionStatus {
  return statusMap[(status || '').toUpperCase()] ?? 'draft'
}

export function displayRequisitionStatus(status?: string | null) {
  return normalizeRequisitionStatus(status).toUpperCase()
}

export function defaultRequisitionValues(): CreateRequisitionFormValues {
  return {
    projectId: '',
    title: 'Revenue project material request',
    department: 'Operations',
    neededBy: '',
    justification: 'Required for approved project delivery.',
    itemDescription: 'Project material or service line',
    itemCategory: 'Project supplies',
    quantity: '1',
    unitPrice: '1000',
  }
}

export function validateRequisitionInput(
  values: CreateRequisitionFormValues,
): CreateRequisitionValidationResult {
  const errors: CreateRequisitionValidationResult['errors'] = {}
  const quantity = toNumber(values.quantity)
  const unitPrice = toNumber(values.unitPrice)

  if (!values.title.trim()) {
    errors.title = 'Requisition title is required.'
  }

  if (!values.department.trim()) {
    errors.department = 'Department or business owner is required.'
  }

  if (!values.justification.trim()) {
    errors.justification = 'Business justification is required.'
  }

  if (!values.itemDescription.trim()) {
    errors.itemDescription = 'At least one item or service description is required.'
  }

  if (quantity <= 0) {
    errors.quantity = 'Quantity must be greater than zero.'
  }

  if (unitPrice <= 0) {
    errors.unitPrice = 'Unit price must be greater than zero.'
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  }
}

export function buildRequisitionCreatePayload(
  values: CreateRequisitionFormValues,
  organizationId: string,
  actorUserId?: string | null,
) {
  return {
    organizationId,
    actorUserId: actorUserId || undefined,
    requesterUserId: actorUserId || undefined,
    projectId: values.projectId || undefined,
    title: values.title.trim(),
    justification: [
      `Department: ${values.department.trim()}`,
      values.neededBy ? `Needed by: ${values.neededBy}` : null,
      `Justification: ${values.justification.trim()}`,
    ]
      .filter(Boolean)
      .join('\n'),
    items: [
      {
        description: values.itemDescription.trim(),
        category: values.itemCategory.trim() || undefined,
        quantity: toNumber(values.quantity),
        unitPrice: toNumber(values.unitPrice),
      },
    ],
  }
}

export function summarizeRequisitions(
  requisitions: readonly RequisitionRecord[],
): RequisitionSummary {
  return requisitions.reduce<RequisitionSummary>(
    (summary, requisition) => {
      const status = normalizeRequisitionStatus(requisition.status)

      summary.total += 1
      summary.totalValue += toNumber(requisition.totalAmount)

      if (status === 'draft') {
        summary.draft += 1
      } else if (status === 'submitted') {
        summary.submitted += 1
      } else if (status === 'approved') {
        summary.approved += 1
      } else if (status === 'rejected') {
        summary.rejected += 1
      }

      return summary
    },
    {
      total: 0,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      totalValue: 0,
    },
  )
}

export function canCreateRequisition(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) => createRoles.has(roleCode))
}

export function canSubmitRequisition(
  requisition: RequisitionRecord,
  roleCodes: readonly AppRoleCode[],
) {
  return (
    normalizeRequisitionStatus(requisition.status) === 'draft' &&
    canCreateRequisition(roleCodes)
  )
}

export function canReviewRequisitions(roleCodes: readonly AppRoleCode[]) {
  return roleCodes.some((roleCode) => approveRoles.has(roleCode))
}

export function getApprovalActionState(
  requisition: RequisitionRecord,
  roleCodes: readonly AppRoleCode[],
  actorUserId?: string | null,
): ApprovalActionState {
  const status = normalizeRequisitionStatus(requisition.status)

  if (!canReviewRequisitions(roleCodes)) {
    return {
      canApprove: false,
      canReject: false,
      reason: 'Approval actions are reserved for approvers and SME admins.',
    }
  }

  if (status !== 'submitted') {
    return {
      canApprove: false,
      canReject: false,
      reason: 'Only submitted requisitions can be approved or rejected.',
    }
  }

  if (
    actorUserId &&
    requisition.requesterUserId &&
    actorUserId === requisition.requesterUserId
  ) {
    return {
      canApprove: false,
      canReject: true,
      reason: 'Requester cannot approve their own requisition.',
    }
  }

  return {
    canApprove: true,
    canReject: true,
  }
}

export function toNumber(value?: number | string | null) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}
