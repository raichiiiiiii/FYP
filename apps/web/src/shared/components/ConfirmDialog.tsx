import { Button } from './Button'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
