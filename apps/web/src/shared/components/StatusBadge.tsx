import { statusModifier } from './statusModifier'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`status-tag status-tag--${statusModifier(status)}`}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  )
}
