import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

type BaseFieldProps = {
  label: string
  name: string
  error?: string
  hint?: ReactNode
  registration?: UseFormRegisterReturn
}

export function FormField({
  label,
  name,
  error,
  hint,
  registration,
  required,
  id,
  ...inputProps
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId()
  const fieldId = id ?? `${name}-${generatedId}`
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <label className="field" htmlFor={fieldId}>
      <span>{label}</span>
      <input
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-required={required || undefined}
        {...registration}
        {...inputProps}
      />
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

export function TextAreaField({
  label,
  name,
  error,
  hint,
  registration,
  required,
  id,
  ...textareaProps
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId()
  const fieldId = id ?? `${name}-${generatedId}`
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <label className="field" htmlFor={fieldId}>
      <span>{label}</span>
      <textarea
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        aria-errormessage={errorId}
        aria-required={required || undefined}
        {...registration}
        {...textareaProps}
      />
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
