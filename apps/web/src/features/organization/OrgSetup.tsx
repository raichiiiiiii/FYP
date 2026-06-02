import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { PageHeader } from '../../layouts/PageHeader'
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
  adminName: z.string().trim().min(1, 'Admin display name is required.'),
  adminEmail: z.string().trim().email('Enter a valid admin email.'),
})

export function OrgSetup() {
  const navigate = useNavigate()
  const { devLogin } = useAuth()
  const { notify } = useToast()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useValidatedForm(orgSetupSchema, {
    defaultValues: {
      legalName: 'Example SME Sdn Bhd',
      registrationNumber: '202606020001',
      adminName: 'Local Admin',
      adminEmail: 'admin@example.test',
    },
  })

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
          deploymentMode: 'standalone_sme',
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
    <>
      <PageHeader eyebrow="Identity foundation" title="Organization setup" />
      <form className="form-grid" noValidate onSubmit={(event) => void submitSetup(event)}>
        {errors.root?.message ? (
          <ErrorState title="Organization setup failed" message={errors.root.message} />
        ) : null}
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
        />
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
        <div className="form-actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create organization'}
          </Button>
        </div>
      </form>
    </>
  )
}
