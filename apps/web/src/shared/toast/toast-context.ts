import { createContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  type: ToastType
  message: string
}

export type ToastContextValue = {
  notify: (toast: Omit<Toast, 'id'>) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
