import type { ReactNode } from 'react'

export function EmptyState({
  title,
  children,
  action,
}: {
  title?: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="state-box state-box--empty" role="note">
      {title ? <strong>{title}</strong> : null}
      {children ? <p>{children}</p> : null}
      {action ? <div className="state-actions">{action}</div> : null}
    </div>
  )
}
