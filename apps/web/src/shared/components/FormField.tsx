import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
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
  ...inputProps
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        {...registration}
        {...inputProps}
      />
      {hint ? <small className="field-hint">{hint}</small> : null}
      {error ? <em className="field-error">{error}</em> : null}
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
  ...textareaProps
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        {...registration}
        {...textareaProps}
      />
      {hint ? <small className="field-hint">{hint}</small> : null}
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  )
}
