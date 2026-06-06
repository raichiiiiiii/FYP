type DemoGuideToggleProps = {
  expanded: boolean
  reviewedCount: number
  totalCount: number
  onToggle: () => void
}

export function DemoGuideToggle({
  expanded,
  reviewedCount,
  totalCount,
  onToggle,
}: DemoGuideToggleProps) {
  return (
    <button
      type="button"
      className="demo-guide-toggle"
      aria-label={
        expanded ? 'Close guided demo checklist' : 'Open guided demo checklist'
      }
      aria-controls="demo-guide-panel"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <span aria-hidden="true">Review</span>
      <strong>Demo guide</strong>
      <small>
        {reviewedCount}/{totalCount} reviewed
      </small>
    </button>
  )
}
