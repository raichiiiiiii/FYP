import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { PageHeader } from '../../layouts/PageHeader'
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
    <>
      <PageHeader eyebrow="Local/dev auth" title="Sign in" />
      <form className="form-grid" noValidate onSubmit={(event) => void submitLogin(event)}>
        <h2>Dev login</h2>
        {apiError ? <ErrorState title="Login failed" message={apiError} /> : null}
        <FormField
          label="Email"
          name="email"
          type="email"
          required
          registration={register('email')}
          error={errors.email?.message}
        />
        <FormField
          label="Organization ID"
          name="organizationId"
          registration={register('organizationId')}
          error={errors.organizationId?.message}
        />
        <div className="form-actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
    </>
  )
}
