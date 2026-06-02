import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  )
}
