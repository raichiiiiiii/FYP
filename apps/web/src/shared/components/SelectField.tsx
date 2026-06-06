import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

export type SelectOption = {
  label: string
  value: string
}

export function SelectField({
  label,
  name,
  options,
  error,
  hint,
  placeholder,
  registration,
  children,
  required,
  id,
  ...selectProps
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  name: string
  options?: readonly SelectOption[]
  error?: string
  hint?: ReactNode
  placeholder?: string
  registration?: UseFormRegisterReturn
  children?: ReactNode
}) {
  const generatedId = useId()
  const fieldId = id ?? `${name}-${generatedId}`
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <label className="field" htmlFor={fieldId}>
      <span>{label}</span>
      <select
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-required={required || undefined}
        {...registration}
        {...selectProps}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      {hint ? (
        <small className="field-hint" id={hintId}>
          {hint}
        </small>
      ) : null}
      {error ? (
        <em className="field-error" id={errorId} role="alert">
          {error}
        </em>
      ) : null}
    </label>
  )
}
