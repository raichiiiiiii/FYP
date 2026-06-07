import type { AuthSession } from '../../shared/types'

const storageKey = 'mepn.auth.session'

export function loadStoredSession() {
  const rawSession = localStorage.getItem(storageKey)

  if (!rawSession) {
    return null
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      clearStoredSession()
      return null
    }

    return session
  } catch {
    clearStoredSession()
    return null
  }
}

export function saveStoredSession(session: AuthSession) {
  localStorage.setItem(storageKey, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(storageKey)
}

export function canHydrateStoredSessionLocally(
  session: Pick<AuthSession, 'authMode'>,
) {
  return session.authMode === 'password' || session.authMode === 'oidc'
}
