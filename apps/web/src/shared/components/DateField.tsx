import type { InputHTMLAttributes } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

export function DateField({
  label,
  name,
  error,
  registration,
  required,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  error?: string
  registration?: UseFormRegisterReturn
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        id={name}
        name={name}
        type="date"
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        {...registration}
        {...inputProps}
      />
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  )
}
