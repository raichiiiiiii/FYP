export function Field({
  label,
  name,
  type = 'text',
  required = false,
  value,
  onChange,
  error,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  )
}
