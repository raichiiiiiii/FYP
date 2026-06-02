import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { canAccessRoute } from '../../app/authorization'
import { matchRouteMetadata } from '../../app/navigation'
import { AccessDenied } from '../../shared/components/AccessDenied'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { appSession, authorization, status } = useAuth()
  const route = matchRouteMetadata(location.pathname)

  if (!route) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return <p className="notice">Loading session...</p>
  }

  if (status !== 'authenticated' && !route.allowAnonymous) {
    return (
      <>
        <AccessDenied />
        <p className="notice">
          <button
            type="button"
            onClick={() =>
              navigate('/login', { state: { returnTo: location.pathname } })
            }
          >
            Sign in
          </button>
        </p>
      </>
    )
  }

  if (!canAccessRoute(route, appSession, authorization)) {
    return <AccessDenied />
  }

  return <>{children}</>
}
