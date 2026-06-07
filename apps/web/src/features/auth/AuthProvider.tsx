import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { authorizationFromSession } from '../../app/authorization'
import type { AuthorizationState } from '../../app/authorization'
import { apiRequest } from '../../shared/api/client'
import type { AuthSession, DevLoginInput } from '../../shared/types'
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from './session-storage'
import { AuthContext } from './useAuth'
import type { AuthStatus } from './useAuth'

function getQuerySessionInput() {
  const params = new URLSearchParams(window.location.search)
  const organizationId = params.get('organizationId')
  const userId = params.get('actorUserId') ?? params.get('userId')

  if (!organizationId || !userId) {
    return null
  }

  return { userId, organizationId }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const persistSession = useCallback((nextSession: AuthSession) => {
    saveStoredSession(nextSession)
    setAuthSession(nextSession)
    setStatus('authenticated')
    setMessage(null)
  }, [])

  const devLogin = useCallback(
    async (input: DevLoginInput) => {
      const nextSession = await apiRequest<AuthSession>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify(input),
      })

      persistSession(nextSession)
      return nextSession
    },
    [persistSession],
  )

  const refreshSession = useCallback(async () => {
    const storedSession = loadStoredSession()

    if (!storedSession) {
      setAuthSession(null)
      setStatus('anonymous')
      return
    }

    const nextSession = await apiRequest<AuthSession>(
      `/auth/session?userId=${encodeURIComponent(
        storedSession.userId,
      )}&organizationId=${encodeURIComponent(storedSession.organizationId)}`,
    )

    persistSession(nextSession)
  }, [persistSession])

  const logout = useCallback(() => {
    clearStoredSession()
    setAuthSession(null)
    setStatus('anonymous')
    setMessage(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.resolve()
      .then(async () => {
        const querySessionInput = getQuerySessionInput()

        if (querySessionInput) {
          return apiRequest<AuthSession>('/auth/dev-login', {
            method: 'POST',
            body: JSON.stringify(querySessionInput),
          })
        }

        const storedSession = loadStoredSession()

        if (!storedSession) {
          return null
        }

        return apiRequest<AuthSession>(
          `/auth/session?userId=${encodeURIComponent(
            storedSession.userId,
          )}&organizationId=${encodeURIComponent(storedSession.organizationId)}`,
        )
      })
      .then((nextSession) => {
        if (cancelled) {
          return
        }

        if (!nextSession) {
          setStatus('anonymous')
          return
        }

        persistSession(nextSession)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          clearStoredSession()
          setAuthSession(null)
          setStatus('error')
          setMessage(
            error instanceof Error ? error.message : 'Unable to load session',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [persistSession])

  const authorization = useMemo(
    (): AuthorizationState => {
      if (status === 'loading') {
        return { status: 'loading', roleCodes: [], permissionCodes: [] }
      }

      if (status === 'error') {
        return {
          status: 'error',
          message: message ?? 'Unable to load session',
          roleCodes: [],
          permissionCodes: [],
        }
      }

      return authorizationFromSession(authSession)
    },
    [authSession, message, status],
  )
  const appSession = useMemo(
    () => ({
      organizationId: authSession?.organizationId ?? null,
      actorUserId: authSession?.userId ?? null,
      organizationDeploymentMode:
        authSession?.organization.deploymentMode ?? null,
    }),
    [authSession],
  )

  return (
    <AuthContext.Provider
      value={{
        status,
        authSession,
        appSession,
        authorization,
        message,
        devLogin,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
