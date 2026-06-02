import { useCallback } from 'react'

import { useAuth } from '../features/auth/useAuth'
import type { AppSession } from '../shared/types'

export function useAppSession() {
  const { appSession, authorization, devLogin } = useAuth()

  const configureSession = useCallback(
    (session: AppSession) => {
      if (!session.actorUserId || !session.organizationId) {
        return
      }

      void devLogin({
        userId: session.actorUserId,
        organizationId: session.organizationId,
      })
    },
    [devLogin],
  )

  return {
    session: appSession,
    authorization,
    configureSession,
  }
}
