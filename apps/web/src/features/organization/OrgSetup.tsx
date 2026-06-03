import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { apiRequest } from '../../shared/api/client'
import { getErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/components/Button'
import { ErrorState } from '../../shared/components/ErrorState'
import { FormField } from '../../shared/components/FormField'
import { useValidatedForm } from '../../shared/forms/useValidatedForm'
import { useToast } from '../../shared/toast/useToast'
import type { Organization, User } from '../../shared/types'
import { useAuth } from '../auth/useAuth'

const orgSetupSchema = z.object({
  legalName: z.string().trim().min(1, 'Legal name is required.'),
  registrationNumber: z.string().trim().optional(),
  taxIdentifier: z.string().trim().optional(),
  shariahProfile: z.string().trim().optional(),
  deploymentMode: z.enum([
    'standalone_sme',
    'financial_entity_node',
    'fabric_organization',
    'hosted_financier_portal',
  ]),
  adminName: z.string().trim().min(1, 'Admin display name is required.'),
  adminEmail: z.string().trim().email('Enter a valid admin email.'),
})

const setupSteps = [
  'Organization profile',
  'Compliance setup',
  'Admin account',
  'Review and create',
]

export function OrgSetup() {
  const navigate = useNavigate()
  const { devLogin } = useAuth()
  const { notify } = useToast()
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useValidatedForm(orgSetupSchema, {
    defaultValues: {
      legalName: 'Example SME Sdn Bhd',
      registrationNumber: '202606020001',
      taxIdentifier: 'C123456789',
      shariahProfile: 'restricted_mudarabah',
      deploymentMode: 'standalone_sme',
      adminName: 'Local Admin',
      adminEmail: 'admin@example.test',
    },
  })
  const formValues = watch()

  const submitSetup = handleSubmit(async (values) => {
    try {
      const result = await apiRequest<{
        organization: Organization
        adminUser: User
      }>('/orgs', {
        method: 'POST',
        body: JSON.stringify({
          legalName: values.legalName,
          registrationNumber: values.registrationNumber,
          taxIdentifier: values.taxIdentifier,
          shariahProfile: values.shariahProfile,
          deploymentMode: values.deploymentMode,
          adminUser: {
            email: values.adminEmail,
            displayName: values.adminName,
          },
        }),
      })

      await devLogin({
        organizationId: result.organization.id,
        userId: result.adminUser.id,
      })
      notify({ type: 'success', message: 'Organization created' })
      navigate('/dashboard')
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to create organization')
      notify({ type: 'error', message })
      setError('root', { type: 'server', message })
    }
  })

  return (
    <main className="setup-page">
      <header className="setup-topbar">
        <div className="entry-brand">
          <span className="entry-logo" aria-hidden="true">
            M
          </span>
          <div>
            <strong>MEPN</strong>
            <span>First-run organization setup</span>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={() => navigate('/login')}>
          Back to sign in
        </Button>
      </header>

      <section className="setup-hero" aria-labelledby="setup-title">
        <div>
          <span className="entry-kicker">Self-hosted SME node bootstrap</span>
          <h1 id="setup-title">Create the organization foundation</h1>
          <p>
            This wizard creates the organization, local admin user, admin role,
            membership, default workspace, and setup audit events required before
            procurement and finance workflows can start.
          </p>
        </div>
        <aside className="setup-hero-note" aria-label="Authentication status">
          <strong>Dev auth active</strong>
          <span>
            The setup completes by signing in through the local development
            session endpoint. OIDC remains planned and is not represented as
            complete here.
          </span>
        </aside>
      </section>

      <ol className="setup-stepper" aria-label="Organization setup progress">
        {setupSteps.map((step, index) => (
          <li
            className={
              index === 0 ? 'setup-step setup-step--active' : 'setup-step'
            }
            key={step}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>

      <form
        className="setup-form"
        noValidate
        onSubmit={(event) => void submitSetup(event)}
      >
        <div className="setup-card setup-card--main">
          {errors.root?.message ? (
            <ErrorState
              title="Organization setup failed"
              message={errors.root.message}
            />
          ) : null}

          <section className="setup-section" aria-labelledby="org-profile-title">
            <div className="setup-section-header">
              <span>Step 1</span>
              <h2 id="org-profile-title">Organization profile</h2>
              <p>
                Register the legal entity that owns procurement records,
                workspaces, users, and audit events.
              </p>
            </div>
            <div className="setup-grid">
              <FormField
                label="Legal name"
                name="legalName"
                required
                registration={register('legalName')}
                error={errors.legalName?.message}
              />
              <FormField
                label="Registration number"
                name="registrationNumber"
                registration={register('registrationNumber')}
                error={errors.registrationNumber?.message}
                hint="Duplicate registration numbers are rejected by the API."
              />
              <FormField
                label="Tax identifier"
                name="taxIdentifier"
                registration={register('taxIdentifier')}
                error={errors.taxIdentifier?.message}
              />
            </div>
          </section>

          <section className="setup-section" aria-labelledby="compliance-title">
            <div className="setup-section-header">
              <span>Step 2</span>
              <h2 id="compliance-title">Compliance profile</h2>
              <p>
                Capture the deployment posture and Shariah profile. These values
                are stored as organization metadata for later policy checks.
              </p>
            </div>
            <div className="setup-grid">
              <label className="field">
                <span>Deployment mode</span>
                <select {...register('deploymentMode')}>
                  <option value="standalone_sme">Standalone SME node</option>
                  <option value="financial_entity_node">
                    Financial entity node
                  </option>
                  <option value="fabric_organization">
                    Fabric organization
                  </option>
                  <option value="hosted_financier_portal">
                    Hosted financier portal
                  </option>
                </select>
                <small className="field-hint">
                  MVP setup defaults to a standalone SME node.
                </small>
              </label>
              <label className="field">
                <span>Shariah profile</span>
                <select {...register('shariahProfile')}>
                  <option value="restricted_mudarabah">
                    Restricted mudarabah
                  </option>
                  <option value="general_procurement">
                    General procurement only
                  </option>
                  <option value="review_required">
                    Review required before financing
                  </option>
                </select>
                <small className="field-hint">
                  Final Shariah approval remains a reviewer decision, not this
                  setup field.
                </small>
              </label>
            </div>
          </section>

          <section className="setup-section" aria-labelledby="admin-title">
            <div className="setup-section-header">
              <span>Step 3</span>
              <h2 id="admin-title">Admin account</h2>
              <p>
                The admin user receives the organization admin role and can
                continue configuring identity, procurement, and evidence flows.
              </p>
            </div>
            <div className="setup-grid">
              <FormField
                label="Admin display name"
                name="adminName"
                required
                registration={register('adminName')}
                error={errors.adminName?.message}
              />
              <FormField
                label="Admin email"
                name="adminEmail"
                type="email"
                required
                registration={register('adminEmail')}
                error={errors.adminEmail?.message}
              />
            </div>
          </section>
        </div>

        <aside className="setup-card setup-review-panel" aria-label="Setup review">
          <span className="eyebrow">Step 4</span>
          <h2>Review and create</h2>
          <p>
            Confirm the bootstrap records that will be created. The app will
            redirect to the dashboard after the dev session is established.
          </p>
          <dl className="setup-review-list">
            <div>
              <dt>Organization</dt>
              <dd>{formValues.legalName || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Registration</dt>
              <dd>{formValues.registrationNumber || 'Optional'}</dd>
            </div>
            <div>
              <dt>Deployment mode</dt>
              <dd>{formValues.deploymentMode}</dd>
            </div>
            <div>
              <dt>Admin</dt>
              <dd>{formValues.adminEmail || 'Not provided'}</dd>
            </div>
          </dl>
          <div className="setup-record-list">
            <strong>Records created</strong>
            <span>Organization</span>
            <span>Admin user</span>
            <span>Organization admin role</span>
            <span>Membership</span>
            <span>General workspace</span>
            <span>Audit events</span>
          </div>
          <p className="setup-inline-note">
            Invite acceptance, expired invite handling, and production OIDC are
            documented blockers, not hidden mock behavior.
          </p>
          <div className="form-actions">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create organization'}
            </Button>
          </div>
        </aside>
      </form>
    </main>
  )
}
