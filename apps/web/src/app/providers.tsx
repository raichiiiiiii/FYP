import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from '../features/auth/AuthProvider'
import { queryClient } from '../shared/api/query-client'
import { ToastProvider } from '../shared/toast/ToastProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
