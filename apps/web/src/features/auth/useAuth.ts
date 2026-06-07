import { createContext, useContext } from 'react'

import type { AuthorizationState } from '../../app/authorization'
import type {
  AppSession,
  AuthSession,
  DevLoginInput,
  PasswordLoginInput,
} from '../../shared/types'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'error'

export type AuthContextValue = {
  status: AuthStatus
  authSession: AuthSession | null
  appSession: AppSession
  authorization: AuthorizationState
  message: string | null
  devLogin: (input: DevLoginInput) => Promise<AuthSession>
  passwordLogin: (input: PasswordLoginInput) => Promise<AuthSession>
  refreshSession: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
