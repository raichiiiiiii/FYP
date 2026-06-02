import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './toast-context'
import type { Toast } from './toast-context'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now()
      setToasts((current) => [...current, { ...toast, id }])
      window.setTimeout(() => dismiss(id), 6000)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className={`toast toast--${toast.type}`}
            onClick={() => dismiss(toast.id)}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
