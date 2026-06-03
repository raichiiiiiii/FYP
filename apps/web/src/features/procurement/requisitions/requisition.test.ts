import { describe, expect, it } from 'vitest'

import type {
  CreateRequisitionFormValues,
  RequisitionRecord,
} from './requisition.types'
import {
  buildRequisitionCreatePayload,
  canCreateRequisition,
  canSubmitRequisition,
  displayRequisitionStatus,
  getApprovalActionState,
  summarizeRequisitions,
  validateRequisitionInput,
} from './requisition.validation'

const validValues: CreateRequisitionFormValues = {
  projectId: 'project-001',
  title: 'Factory order materials',
  department: 'Operations',
  neededBy: '2026-06-30',
  justification: 'Required to fulfill buyer demand.',
  itemDescription: 'Raw material batch',
  itemCategory: 'Manufacturing inputs',
  quantity: '3',
  unitPrice: '4000',
}

const submittedRequisition: RequisitionRecord = {
  id: 'req-001',
  title: 'Factory order materials',
  status: 'SUBMITTED',
  requesterUserId: 'requester-001',
  totalAmount: 12000,
}

describe('requisition model and policy', () => {
  it('validates and builds a create payload with department, due date, and item category', () => {
    const validation = validateRequisitionInput(validValues)
    const payload = buildRequisitionCreatePayload(
      validValues,
      'org-001',
      'requester-001',
    )

    expect(validation.ok).toBe(true)
    expect(payload.organizationId).toBe('org-001')
    expect(payload.requesterUserId).toBe('requester-001')
    expect(payload.justification).toContain('Department: Operations')
    expect(payload.justification).toContain('Needed by: 2026-06-30')
    expect(payload.items[0]).toMatchObject({
      description: 'Raw material batch',
      category: 'Manufacturing inputs',
      quantity: 3,
      unitPrice: 4000,
    })
  })

  it('blocks incomplete requisition input before API submission', () => {
    const validation = validateRequisitionInput({
      ...validValues,
      title: '',
      itemDescription: '',
      quantity: '0',
      unitPrice: '-1',
    })

    expect(validation.ok).toBe(false)
    expect(validation.errors.title).toBe('Requisition title is required.')
    expect(validation.errors.itemDescription).toContain('At least one item')
    expect(validation.errors.quantity).toContain('greater than zero')
    expect(validation.errors.unitPrice).toContain('greater than zero')
  })

  it('allows procurement roles to create and submit draft requisitions', () => {
    const draft: RequisitionRecord = {
      id: 'req-draft',
      title: 'Draft',
      status: 'DRAFT',
      totalAmount: 1000,
    }

    expect(canCreateRequisition(['PROCUREMENT_OFFICER'])).toBe(true)
    expect(canCreateRequisition(['APPROVER'])).toBe(false)
    expect(canSubmitRequisition(draft, ['PROCUREMENT_OFFICER'])).toBe(true)
    expect(canSubmitRequisition(draft, ['APPROVER'])).toBe(false)
  })

  it('shows approval actions only to approval roles for submitted requisitions', () => {
    expect(
      getApprovalActionState(
        submittedRequisition,
        ['APPROVER'],
        'approver-001',
      ),
    ).toEqual({
      canApprove: true,
      canReject: true,
    })

    expect(
      getApprovalActionState(
        submittedRequisition,
        ['PROCUREMENT_OFFICER'],
        'approver-001',
      ).reason,
    ).toContain('reserved')
  })

  it('prevents requesters from approving their own requisitions', () => {
    const state = getApprovalActionState(
      submittedRequisition,
      ['APPROVER'],
      'requester-001',
    )

    expect(state.canApprove).toBe(false)
    expect(state.canReject).toBe(true)
    expect(state.reason).toContain('Requester cannot approve')
  })

  it('summarizes requisitions for the procurement dashboard', () => {
    const summary = summarizeRequisitions([
      { ...submittedRequisition },
      { id: 'req-002', title: 'Approved', status: 'APPROVED', totalAmount: 5000 },
      { id: 'req-003', title: 'Draft', status: 'DRAFT', totalAmount: '750' },
    ])

    expect(summary).toMatchObject({
      total: 3,
      draft: 1,
      submitted: 1,
      approved: 1,
      rejected: 0,
      totalValue: 17750,
    })
    expect(displayRequisitionStatus('converted_to_po')).toBe('CONVERTED_TO_PO')
  })
})
