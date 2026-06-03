import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '../../shared/components/Button'
import { ErrorState } from '../../shared/components/ErrorState'
import { FormField } from '../../shared/components/FormField'
import { useValidatedForm } from '../../shared/forms/useValidatedForm'
import { useToast } from '../../shared/toast/useToast'
import { useAuth } from './useAuth'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  organizationId: z.string().trim().optional(),
})

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { devLogin } = useAuth()
  const { notify } = useToast()
  const [inviteToken, setInviteToken] = useState('')
  const [inviteNoticeVisible, setInviteNoticeVisible] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useValidatedForm(loginSchema, {
    defaultValues: {
      email: 'admin@example.test',
      organizationId: '',
    },
  })
  const apiError = errors.root?.message

  function checkInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviteNoticeVisible(true)
  }

  const submitLogin = handleSubmit(async (values) => {
    try {
      await devLogin({
        email: values.email,
        organizationId: values.organizationId || undefined,
      })
      notify({ type: 'success', message: 'Signed in' })
      const returnTo =
        typeof location.state === 'object' &&
        location.state &&
        'returnTo' in location.state &&
        typeof location.state.returnTo === 'string'
          ? location.state.returnTo
          : '/dashboard'

      navigate(returnTo)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in'
      notify({ type: 'error', message })
      setError('root', { type: 'server', message })
    }
  })

  return (
    <main className="entry-page">
      <header className="entry-topbar">
        <div className="entry-brand">
          <span className="entry-logo" aria-hidden="true">
            M
          </span>
          <div>
            <strong>MEPN</strong>
            <span>Mudarabah-Enabled Procurement Network</span>
          </div>
        </div>
        <div className="entry-badges" aria-label="Environment status">
          <span className="entry-badge entry-badge--warning">
            Prototype - not production ready
          </span>
          <span className="entry-badge entry-badge--success">
            Local API-backed demo
          </span>
        </div>
      </header>

      <section className="entry-hero" aria-labelledby="entry-title">
        <div className="entry-hero-copy">
          <span className="entry-kicker">
            Self-hosted SME node / procurement finance
          </span>
          <h1 id="entry-title">Restricted procurement, compliant financing</h1>
          <p>
            MEPN links procurement records, evidence packs, audit events, and
            restricted mudarabah financing inside an organization-scoped node.
            Protected records are shown only after session and role checks.
          </p>
          <div className="entry-trust-grid" aria-label="Entry safety summary">
            <span>Role-bound access</span>
            <span>Organization context required</span>
            <span>Audit and outbox aware</span>
            <span>OIDC planned, dev auth active</span>
          </div>
        </div>

        <div className="entry-card-stack">
          <form
            className="entry-panel entry-panel--primary"
            noValidate
            onSubmit={(event) => void submitLogin(event)}
          >
            <div className="entry-panel-header">
              <span className="eyebrow">Local/dev auth</span>
              <h2>Sign in to the prototype</h2>
              <p>
                Use a seeded user email and organization ID. Production OIDC is
                still behind the auth boundary and is not active yet.
              </p>
            </div>
            {apiError ? (
              <ErrorState title="Login failed" message={apiError} />
            ) : null}
            <FormField
              label="Email"
              name="email"
              type="email"
              required
              registration={register('email')}
              error={errors.email?.message}
              hint="Example seed users can sign in by email when membership exists."
            />
            <FormField
              label="Organization ID"
              name="organizationId"
              registration={register('organizationId')}
              error={errors.organizationId?.message}
              hint="Optional when the user has one active organization membership."
            />
            <div className="form-actions">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/org/setup')}
              >
                Register organization
              </Button>
            </div>
          </form>

          <section className="entry-action-grid" aria-label="Entry options">
            <article className="entry-mini-card">
              <span>New organization</span>
              <strong>Bootstrap an SME node</strong>
              <p>
                Create organization, admin user, role, membership, workspace,
                and setup audit events.
              </p>
              <Link to="/org/setup">Start setup</Link>
            </article>

            <form className="entry-mini-card" onSubmit={checkInvite}>
              <span>Invitation</span>
              <strong>Token entry</strong>
              <label className="field">
                <span>Invitation token</span>
                <input
                  value={inviteToken}
                  onChange={(event) => {
                    setInviteToken(event.target.value)
                    setInviteNoticeVisible(false)
                  }}
                  placeholder="Invite token"
                />
              </label>
              <Button type="submit" variant="ghost">
                Check invitation
              </Button>
              {inviteNoticeVisible ? (
                <p className="entry-inline-warning">
                  Invitation validation is planned. Backend invite endpoints are
                  not connected yet, so expired or invalid tokens cannot be
                  verified from this screen.
                </p>
              ) : null}
            </form>
          </section>
        </div>
      </section>
    </main>
  )
}
