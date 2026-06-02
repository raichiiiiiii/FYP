import type { ReactNode } from 'react'

export function DataCard({
  label,
  children,
  wide = false,
}: {
  label: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <article className={wide ? 'wide' : undefined}>
      <span>{label}</span>
      <strong>{children}</strong>
    </article>
  )
}
