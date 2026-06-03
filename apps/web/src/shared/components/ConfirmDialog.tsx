import { useEffect, useId, useRef } from 'react'

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
  const titleId = useId()
  const messageId = useId()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      cancelButtonRef.current?.focus()
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onCancel()
          }
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={messageId}>{message}</p>
        <div className="form-actions">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
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
