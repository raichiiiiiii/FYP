import type { InputHTMLAttributes } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

export function MoneyField({
  label,
  name,
  currency = 'MYR',
  error,
  registration,
  required,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  currency?: string
  error?: string
  registration?: UseFormRegisterReturn
}) {
  return (
    <label className="field">
      <span>
        {label} <small>({currency})</small>
      </span>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        {...registration}
        {...inputProps}
      />
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  )
}
