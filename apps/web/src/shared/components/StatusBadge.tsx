export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-tag status-tag--${status}`}>{status}</span>
}
