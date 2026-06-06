import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { apiRequest } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { Button } from '../../shared/components/Button'
import { ErrorState } from '../../shared/components/ErrorState'
import { FormField } from '../../shared/components/FormField'
import { LoadingState } from '../../shared/components/LoadingState'
import type { AuthPublicConfig } from '../../shared/types'
import { useToast } from '../../shared/toast/useToast'
import { useAuth } from './useAuth'

type InvitationPreview = {
  id: string
  organizationId: string
  email: string
  roleCode?: string | null
  resolvedStatus: 'pending' | 'accepted' | 'revoked' | 'expired'
  organization?: {
    legalName: string
  } | null
}

type AcceptInvitationResponse = {
  invitation: InvitationPreview
  user: {
    email: string
  }
}

export function InviteAcceptancePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { devLogin } = useAuth()
  const { notify } = useToast()
  const token = params.get('token') ?? ''
  const [displayName, setDisplayName] = useState('')
  const [authConfig, setAuthConfig] = useState<AuthPublicConfig | null>(null)
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiRequest<AuthPublicConfig>(endpoints.auth.config),
      token
        ? apiRequest<InvitationPreview>(endpoints.auth.invitationAccept(token))
        : Promise.reject(new Error('Invitation token is required')),
    ])
      .then(([config, invitation]) => {
        if (!cancelled) {
          setAuthConfig(config)
          setPreview(invitation)
          setDisplayName(displayNameFromEmail(invitation.email))
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Unable to load invitation',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function acceptInvitation() {
    if (!token || !preview) {
      return
    }

    try {
      setSubmitting(true)
      const response = await apiRequest<AcceptInvitationResponse>(
        endpoints.auth.invitationAccept(),
        {
          method: 'POST',
          body: JSON.stringify({
            token,
            displayName,
          }),
        },
      )
      setAccepted(true)
      notify({ type: 'success', message: 'Invitation accepted' })

      if (authConfig?.devAuthEnabled) {
        await devLogin({
          email: response.user.email,
          organizationId: response.invitation.organizationId,
        })
        navigate('/dashboard')
      }
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to accept invitation'
      setError(message)
      notify({ type: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  const blockedStatus =
    preview?.resolvedStatus && preview.resolvedStatus !== 'pending'

  return (
    <main className="entry-page">
      <section className="entry-hero" aria-labelledby="invite-title">
        <div className="entry-hero-copy">
          <span className="entry-kicker">Organization invitation</span>
          <h1 id="invite-title">Accept MEPN access</h1>
          <p>
            Invitation tokens are validated by the backend before membership is
            created. Expired, revoked, and already accepted invitations cannot
            create a session.
          </p>
        </div>

        <div className="entry-panel entry-panel--primary">
          {!preview && !error ? (
            <LoadingState message="Checking invitation..." />
          ) : null}
          {error ? (
            <ErrorState title="Invitation unavailable" message={error} />
          ) : null}
          {preview ? (
            <>
              <div className="entry-panel-header">
                <span className="eyebrow">Invitation</span>
                <h2>{preview.organization?.legalName ?? 'Organization'}</h2>
                <p>
                  {preview.email} will be added as{' '}
                  {preview.roleCode ?? 'a member'}.
                </p>
              </div>

              {blockedStatus ? (
                <ErrorState
                  title={`Invitation ${preview.resolvedStatus}`}
                  message="Request a fresh invitation from an organization administrator."
                />
              ) : accepted ? (
                <div className="notice">
                  Invitation accepted. Use the configured sign-in method to
                  continue if you were not signed in automatically.
                </div>
              ) : (
                <>
                  <FormField
                    label="Display name"
                    name="displayName"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    hint="This name is stored on the user profile created from the invitation."
                  />
                  <div className="form-actions">
                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={() => void acceptInvitation()}
                    >
                      {submitting ? 'Accepting...' : 'Accept invitation'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate('/login')}
                    >
                      Back to sign in
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function displayNameFromEmail(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
