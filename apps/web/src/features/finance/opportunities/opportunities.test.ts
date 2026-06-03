import { describe, expect, it } from 'vitest'

import { opportunityFixtures } from './opportunities.fixtures'
import type { CreateOpportunityFormValues } from './opportunities.types'
import {
  buildDraftApplicationPayload,
  buildOpportunityCreatePayload,
  canCreateDraftApplication,
  canCreateOpportunity,
  canViewOpportunities,
  mapOpportunities,
  validateOpportunityInput,
} from './opportunities.validation'

const validOpportunityInput: CreateOpportunityFormValues = {
  projectId: 'project-001',
  purchaseOrderId: 'po-internal-001',
  evidencePackId: 'pack-001',
  title: 'Revenue-backed catering order',
  sourceType: 'buyer_purchase_order',
  sourceDocumentId: 'BUYER-PO-2026-001',
  buyerName: 'Example School Sdn Bhd',
  expectedRevenueAmount: '18000',
  expectedCostAmount: '12000',
  requestedCapitalAmount: '12000',
  currency: 'MYR',
  isRevenueGenerating: true,
  isRoutineInternalConsumption: false,
}

describe('finance opportunity eligibility', () => {
  it('accepts a valid buyer-demand opportunity and builds the backend payload', () => {
    const validation = validateOpportunityInput(validOpportunityInput)
    const payload = buildOpportunityCreatePayload(
      validOpportunityInput,
      'org-001',
      'user-001',
    )

    expect(validation.ok).toBe(true)
    expect(payload.projectId).toBe('project-001')
    expect(payload.estimatedCapital).toBe(12000)
    expect(payload.expectedProfit).toBe(6000)
    expect(payload.description).toContain('Source: buyer_purchase_order')
    expect(payload.description).toContain('Buyer: Example School Sdn Bhd')
  })

  it('blocks routine internal consumption from opportunity creation', () => {
    const validation = validateOpportunityInput({
      ...validOpportunityInput,
      isRoutineInternalConsumption: true,
    })

    expect(validation.ok).toBe(false)
    expect(validation.errors.form).toBe(
      'Routine internal consumption cannot proceed as a mudarabah opportunity.',
    )
  })

  it('blocks non-revenue-generating requests and missing margin', () => {
    const validation = validateOpportunityInput({
      ...validOpportunityInput,
      expectedRevenueAmount: '9000',
      expectedCostAmount: '12000',
      isRevenueGenerating: false,
    })

    expect(validation.ok).toBe(false)
    expect(validation.errors.form).toContain('external buyer demand')
    expect(validation.errors.expectedRevenueAmount).toContain(
      'Expected revenue must exceed expected cost',
    )
  })

  it('maps backend opportunities into application draft eligibility', () => {
    const [readyOpportunity, blockedOpportunity] =
      mapOpportunities(opportunityFixtures)

    expect(readyOpportunity.status).toBe('ready_for_application')
    expect(canCreateDraftApplication(readyOpportunity)).toBe(true)
    expect(blockedOpportunity.status).toBe('ineligible')
    expect(canCreateDraftApplication(blockedOpportunity)).toBe(false)
  })

  it('links an eligible opportunity to a draft application payload', () => {
    const [readyOpportunity] = mapOpportunities(opportunityFixtures)
    const payload = buildDraftApplicationPayload(
      readyOpportunity,
      'org-001',
      'user-001',
    )

    expect(payload.opportunityId).toBe(readyOpportunity.id)
    expect(payload.requestedCapital).toBe(readyOpportunity.requestedCapitalAmount)
    expect(payload.purpose).toContain(readyOpportunity.sourceDocumentId)
  })

  it('limits opportunity access to admins and finance-side viewers', () => {
    expect(canCreateOpportunity(['ORG_ADMIN'])).toBe(true)
    expect(canCreateOpportunity(['PROCUREMENT_OFFICER'])).toBe(false)
    expect(canCreateOpportunity(['FINANCIER_USER'])).toBe(false)
    expect(canViewOpportunities(['FINANCIER_USER'])).toBe(true)
    expect(canViewOpportunities(['PROCUREMENT_OFFICER'])).toBe(false)
    expect(canViewOpportunities(['AUDITOR'])).toBe(false)
  })
})
