import type { ReactNode, SelectHTMLAttributes } from 'react'
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
  placeholder,
  registration,
  children,
  required,
  ...selectProps
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  name: string
  options?: SelectOption[]
  error?: string
  placeholder?: string
  registration?: UseFormRegisterReturn
  children?: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
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
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  )
}
