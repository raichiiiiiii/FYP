import { useState } from 'react'
import type { FormEvent } from 'react'

import { Field } from '../../../shared/components/Field'
import type {
  CreateRequisitionFormValues,
  CreateRequisitionValidationResult,
  ProcurementProjectOption,
} from './requisition.types'
import {
  defaultRequisitionValues,
  validateRequisitionInput,
} from './requisition.validation'

export function RequisitionForm({
  projects,
  canCreate,
  isSubmitting,
  onSubmit,
}: {
  projects: ProcurementProjectOption[]
  canCreate: boolean
  isSubmitting: boolean
  onSubmit: (values: CreateRequisitionFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<CreateRequisitionFormValues>(
    defaultRequisitionValues,
  )
  const [errors, setErrors] = useState<
    CreateRequisitionValidationResult['errors']
  >({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateRequisitionInput(values)
    setErrors(result.errors)

    if (!result.ok) {
      return
    }

    await onSubmit(values)
  }

  function updateValue<Key extends keyof CreateRequisitionFormValues>(
    key: Key,
    value: CreateRequisitionFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      className="form-grid requisition-form"
      onSubmit={(event) => void submit(event)}
    >
      <h2>Create requisition</h2>
      {!canCreate ? (
        <p className="notice">
          Your current role can review procurement records, but requisition
          creation is limited to SME admins and procurement officers.
        </p>
      ) : null}
      {errors.form ? <p className="error-text">{errors.form}</p> : null}

      <Field
        label="Title"
        name="title"
        required
        value={values.title}
        onChange={(value) => updateValue('title', value)}
        error={errors.title}
      />
      <label className="field">
        <span>Project</span>
        <select
          disabled={!canCreate}
          value={values.projectId}
          onChange={(event) => updateValue('projectId', event.target.value)}
        >
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Department"
        name="department"
        required
        value={values.department}
        onChange={(value) => updateValue('department', value)}
        error={errors.department}
      />
      <Field
        label="Needed by"
        name="neededBy"
        type="date"
        value={values.neededBy}
        onChange={(value) => updateValue('neededBy', value)}
        error={errors.neededBy}
      />
      <Field
        label="Justification"
        name="justification"
        required
        value={values.justification}
        onChange={(value) => updateValue('justification', value)}
        error={errors.justification}
      />
      <Field
        label="Item or service"
        name="itemDescription"
        required
        value={values.itemDescription}
        onChange={(value) => updateValue('itemDescription', value)}
        error={errors.itemDescription}
      />
      <Field
        label="Category"
        name="itemCategory"
        value={values.itemCategory}
        onChange={(value) => updateValue('itemCategory', value)}
        error={errors.itemCategory}
      />
      <Field
        label="Quantity"
        name="quantity"
        type="number"
        required
        value={values.quantity}
        onChange={(value) => updateValue('quantity', value)}
        error={errors.quantity}
      />
      <Field
        label="Unit price"
        name="unitPrice"
        type="number"
        required
        value={values.unitPrice}
        onChange={(value) => updateValue('unitPrice', value)}
        error={errors.unitPrice}
      />

      <div className="form-actions">
        <button type="submit" disabled={!canCreate || isSubmitting}>
          Create requisition
        </button>
      </div>
    </form>
  )
}
