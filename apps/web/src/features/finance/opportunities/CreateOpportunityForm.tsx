import { useState } from 'react'
import type { FormEvent } from 'react'

import { Field } from '../../../shared/components/Field'
import {
  defaultOpportunityValues,
  opportunitySourceLabels,
  validateOpportunityInput,
} from './opportunities.validation'
import type {
  CreateOpportunityFormValues,
  CreateOpportunityValidationResult,
  EvidencePackOption,
  ProjectOption,
  PurchaseOrderOption,
} from './opportunities.types'

export function CreateOpportunityForm({
  projects,
  purchaseOrders,
  evidencePacks,
  canCreate,
  isSubmitting,
  onSubmit,
}: {
  projects: ProjectOption[]
  purchaseOrders: PurchaseOrderOption[]
  evidencePacks: EvidencePackOption[]
  canCreate: boolean
  isSubmitting: boolean
  onSubmit: (values: CreateOpportunityFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<CreateOpportunityFormValues>(
    defaultOpportunityValues,
  )
  const [errors, setErrors] = useState<
    CreateOpportunityValidationResult['errors']
  >({})
  const selectedPurchaseOrder = purchaseOrders.find(
    (order) => order.id === values.purchaseOrderId,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateOpportunityInput(values)
    setErrors(result.errors)

    if (!result.ok) {
      return
    }

    await onSubmit(values)
    setValues(defaultOpportunityValues())
    setErrors({})
  }

  function updateValue<Key extends keyof CreateOpportunityFormValues>(
    key: Key,
    value: CreateOpportunityFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function selectPurchaseOrder(purchaseOrderId: string) {
    const purchaseOrder = purchaseOrders.find((order) => order.id === purchaseOrderId)
    const totalAmount = String(purchaseOrder?.totalAmount ?? '')

    setValues((current) => ({
      ...current,
      purchaseOrderId,
      sourceType: purchaseOrderId ? 'buyer_purchase_order' : current.sourceType,
      sourceDocumentId: purchaseOrder?.poNumber || current.sourceDocumentId,
      expectedCostAmount: totalAmount || current.expectedCostAmount,
      requestedCapitalAmount: totalAmount || current.requestedCapitalAmount,
    }))
  }

  return (
    <form
      className="form-grid opportunity-form"
      onSubmit={(event) => void submit(event)}
    >
      <div className="opportunity-form-header">
        <span className="eyebrow">Create opportunity</span>
        <h2>Source-backed finance intake</h2>
        <p>
          Select a procurement project and external buyer evidence before
          requesting restricted mudarabah capital.
        </p>
      </div>
      {!canCreate ? (
        <p className="notice">
          Your current role can view opportunities, but only SME admins can
          create new financing opportunities in the current MVP.
        </p>
      ) : null}
      {errors.form ? <p className="error-text">{errors.form}</p> : null}

      <label className="field">
        <span>Project</span>
        <select
          aria-invalid={Boolean(errors.projectId)}
          disabled={!canCreate}
          required
          value={values.projectId}
          onChange={(event) => updateValue('projectId', event.target.value)}
        >
          <option value="">Select project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {errors.projectId ? <em className="field-error">{errors.projectId}</em> : null}
      </label>

      <label className="field">
        <span>Source document type</span>
        <select
          aria-invalid={Boolean(errors.sourceType)}
          disabled={!canCreate}
          required
          value={values.sourceType}
          onChange={(event) =>
            updateValue(
              'sourceType',
              event.target.value as CreateOpportunityFormValues['sourceType'],
            )
          }
        >
          <option value="">Select source type</option>
          {Object.entries(opportunitySourceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.sourceType ? (
          <em className="field-error">{errors.sourceType}</em>
        ) : null}
      </label>

      <div className="opportunity-source-help">
        <strong>Accepted revenue evidence</strong>
        <p>
          Buyer purchase order, contract award, sales order, tender result, or
          equivalent document. Free-text capital requests and internal
          consumption remain blocked.
        </p>
      </div>

      <label className="field">
        <span>Linked purchase order</span>
        <select
          disabled={!canCreate}
          value={values.purchaseOrderId}
          onChange={(event) => selectPurchaseOrder(event.target.value)}
        >
          <option value="">No internal PO link</option>
          {purchaseOrders.map((purchaseOrder) => (
            <option key={purchaseOrder.id} value={purchaseOrder.id}>
              {purchaseOrder.poNumber} - {purchaseOrder.status}
            </option>
          ))}
        </select>
        <small>
          Optional internal procurement link. The revenue source still needs an
          external buyer document reference.
        </small>
      </label>

      {selectedPurchaseOrder ? (
        <div className="opportunity-prefill-preview">
          <strong>PO prefill preview</strong>
          <span>{selectedPurchaseOrder.poNumber}</span>
          <small>
            Cost and capital fields are prefilled from the internal PO. Confirm
            the external buyer document before submitting.
          </small>
        </div>
      ) : null}

      <label className="field">
        <span>Evidence pack</span>
        <select
          disabled={!canCreate}
          value={values.evidencePackId}
          onChange={(event) => updateValue('evidencePackId', event.target.value)}
        >
          <option value="">No evidence pack yet</option>
          {evidencePacks.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.title}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="Opportunity title"
        name="title"
        required
        value={values.title}
        onChange={(value) => updateValue('title', value)}
        error={errors.title}
      />
      <Field
        label="Source document reference"
        name="sourceDocumentId"
        required
        value={values.sourceDocumentId}
        onChange={(value) => updateValue('sourceDocumentId', value)}
        error={errors.sourceDocumentId}
      />
      <Field
        label="Buyer name"
        name="buyerName"
        required
        value={values.buyerName}
        onChange={(value) => updateValue('buyerName', value)}
        error={errors.buyerName}
      />
      <Field
        label="Expected revenue"
        name="expectedRevenueAmount"
        type="number"
        required
        value={values.expectedRevenueAmount}
        onChange={(value) => updateValue('expectedRevenueAmount', value)}
        error={errors.expectedRevenueAmount}
      />
      <Field
        label="Expected cost"
        name="expectedCostAmount"
        type="number"
        required
        value={values.expectedCostAmount}
        onChange={(value) => updateValue('expectedCostAmount', value)}
        error={errors.expectedCostAmount}
      />
      <Field
        label="Requested capital"
        name="requestedCapitalAmount"
        type="number"
        required
        value={values.requestedCapitalAmount}
        onChange={(value) => updateValue('requestedCapitalAmount', value)}
        error={errors.requestedCapitalAmount}
      />

      <div className="opportunity-checks">
        <strong>Eligibility confirmation</strong>
        <label>
          <input
            type="checkbox"
            checked={values.isRevenueGenerating}
            disabled={!canCreate}
            onChange={(event) =>
              updateValue('isRevenueGenerating', event.target.checked)
            }
          />
          <span>External buyer demand creates separately measurable revenue</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.isRoutineInternalConsumption}
            disabled={!canCreate}
            onChange={(event) =>
              updateValue('isRoutineInternalConsumption', event.target.checked)
            }
          />
          <span>This is routine internal consumption</span>
        </label>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={!canCreate || isSubmitting || !projects.length}
        >
          Create opportunity
        </button>
      </div>
    </form>
  )
}
