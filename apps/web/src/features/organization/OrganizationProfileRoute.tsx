import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { z } from 'zod'

import { useAppSession } from '../../app/session'
import { PageHeader } from '../../layouts/PageHeader'
import { apiRequest } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { getErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/components/Button'
import { ErrorState } from '../../shared/components/ErrorState'
import { FormField, TextAreaField } from '../../shared/components/FormField'
import { LoadingState } from '../../shared/components/LoadingState'
import { SelectField } from '../../shared/components/SelectField'
import { useValidatedForm } from '../../shared/forms/useValidatedForm'
import { useToast } from '../../shared/toast/useToast'
import type { Organization } from '../../shared/types'
import {
  exampleSmeProfileImages,
  isSupportedOrganizationProfileImage,
  maxProfileImageBytes,
} from './organizationProfile.model'

const organizationProfileSchema = z.object({
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
  logoImageUrl: z.string().optional(),
  bannerImageUrl: z.string().optional(),
})

type OrganizationProfileValues = z.infer<typeof organizationProfileSchema>

export function OrganizationProfileRoute() {
  const { session } = useAppSession()
  const { notify } = useToast()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useValidatedForm(organizationProfileSchema, {
    defaultValues: defaultOrganizationProfileValues(),
  })
  const values = watch()

  const applyOrganization = useCallback(
    (loaded: Organization) => {
      setOrganization(loaded)
      reset(valuesFromOrganization(loaded))
    },
    [reset],
  )

  const loadOrganization = useCallback(async () => {
    if (!session.organizationId) {
      setLoading(false)
      setMessage('Sign in with an organization context to edit the profile.')
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      const loaded = await apiRequest<Organization>(
        endpoints.organizations.detail(session.organizationId),
      )
      applyOrganization(loaded)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load organization profile'))
    } finally {
      setLoading(false)
    }
  }, [applyOrganization, session.organizationId])

  useEffect(() => {
    let cancelled = false

    if (!session.organizationId) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setLoading(false)
          setMessage('Sign in with an organization context to edit the profile.')
        }
      })
      return () => {
        cancelled = true
      }
    }

    apiRequest<Organization>(endpoints.organizations.detail(session.organizationId))
      .then((loaded) => {
        if (!cancelled) {
          applyOrganization(loaded)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(getErrorMessage(error, 'Unable to load organization profile'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [applyOrganization, session.organizationId])

  const logoPreview = values.logoImageUrl || exampleSmeProfileImages.logoImageUrl
  const bannerPreview =
    values.bannerImageUrl || exampleSmeProfileImages.bannerImageUrl
  const isUsingExampleImages = useMemo(
    () =>
      values.logoImageUrl === exampleSmeProfileImages.logoImageUrl &&
      values.bannerImageUrl === exampleSmeProfileImages.bannerImageUrl,
    [values.bannerImageUrl, values.logoImageUrl],
  )

  const submitProfile = handleSubmit(async (formValues) => {
    if (!session.organizationId || !session.actorUserId) {
      setMessage('Organization admin session is required.')
      return
    }

    try {
      setMessage(null)
      const updated = await apiRequest<Organization>(
        endpoints.organizations.detail(session.organizationId),
        {
          method: 'PATCH',
          body: JSON.stringify({
            actorUserId: session.actorUserId,
            legalName: formValues.legalName,
            registrationNumber: optionalProfileValue(
              formValues.registrationNumber,
            ),
            taxIdentifier: optionalProfileValue(formValues.taxIdentifier),
            shariahProfile: optionalProfileValue(formValues.shariahProfile),
            deploymentMode: formValues.deploymentMode,
            logoImageUrl: optionalProfileValue(formValues.logoImageUrl),
            bannerImageUrl: optionalProfileValue(formValues.bannerImageUrl),
          }),
        },
      )
      setOrganization(updated)
      reset(valuesFromOrganization(updated))
      notify({ type: 'success', message: 'Organization profile updated' })
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        'Unable to update organization profile',
      )
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  async function handleImageFile(
    fieldName: 'logoImageUrl' | 'bannerImageUrl',
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const setImageError =
      fieldName === 'logoImageUrl' ? setLogoError : setBannerError

    if (!isSupportedOrganizationProfileImage(file)) {
      setImageError('Use a PNG or JPG image.')
      event.target.value = ''
      return
    }

    if (file.size > maxProfileImageBytes) {
      setImageError('Use an image smaller than 1.5 MB.')
      event.target.value = ''
      return
    }

    setImageError(null)
    setValue(fieldName, await readFileAsDataUrl(file), { shouldDirty: true })
  }

  function applyExampleImages() {
    setLogoError(null)
    setBannerError(null)
    setValue('logoImageUrl', exampleSmeProfileImages.logoImageUrl, {
      shouldDirty: true,
    })
    setValue('bannerImageUrl', exampleSmeProfileImages.bannerImageUrl, {
      shouldDirty: true,
    })
  }

  function clearImage(fieldName: 'logoImageUrl' | 'bannerImageUrl') {
    setValue(fieldName, '', { shouldDirty: true })
  }

  if (loading) {
    return <LoadingState message="Loading organization profile..." />
  }

  if (!organization && message) {
    return <ErrorState title="Organization profile unavailable" message={message} />
  }

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Organization profile"
        action={
          <Button type="button" variant="secondary" onClick={() => void loadOrganization()}>
            Refresh profile
          </Button>
        }
      />

      <section className="organization-profile-hero" aria-label="Profile preview">
        <OrganizationProfilePreview
          legalName={values.legalName}
          registrationNumber={values.registrationNumber}
          logoImageUrl={logoPreview}
          bannerImageUrl={bannerPreview}
          profileStatus={
            isUsingExampleImages
              ? 'Example SME mock imagery selected'
              : values.logoImageUrl || values.bannerImageUrl
                ? 'Custom profile imagery ready'
                : 'Example SME preview fallback'
          }
        />
      </section>

      {message ? (
        <ErrorState title="Organization profile action failed" message={message} />
      ) : null}

      <form
        className="organization-profile-layout"
        noValidate
        onSubmit={(event) => void submitProfile(event)}
      >
        <section className="form-grid" aria-labelledby="org-profile-form-title">
          <div>
            <h2 id="org-profile-form-title">Current organization information</h2>
            <p className="form-support-copy">
              Updates are persisted to the active organization record and audited
              by the backend. Only organization admins can save this profile.
            </p>
          </div>

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
            label="Tax identifier"
            name="taxIdentifier"
            registration={register('taxIdentifier')}
            error={errors.taxIdentifier?.message}
          />
          <SelectField
            label="Deployment mode"
            name="deploymentMode"
            registration={register('deploymentMode')}
            options={[
              { value: 'standalone_sme', label: 'Standalone SME node' },
              {
                value: 'financial_entity_node',
                label: 'Financial entity node',
              },
              { value: 'fabric_organization', label: 'Fabric organization' },
              {
                value: 'hosted_financier_portal',
                label: 'Hosted financier portal',
              },
            ]}
            error={errors.deploymentMode?.message}
          />
          <TextAreaField
            label="Shariah profile"
            name="shariahProfile"
            rows={4}
            registration={register('shariahProfile')}
            error={errors.shariahProfile?.message}
            hint="Describe the organization policy posture. This does not replace reviewer approval."
          />
          <input type="hidden" {...register('logoImageUrl')} />
          <input type="hidden" {...register('bannerImageUrl')} />
        </section>

        <aside className="organization-profile-media" aria-label="Profile media">
          <div>
            <span className="eyebrow">Profile images</span>
            <h2>Logo and banner</h2>
            <p>
              Upload PNG or JPG images. Files are previewed immediately and saved
              as organization profile image references.
            </p>
          </div>

          <Button type="button" variant="secondary" onClick={applyExampleImages}>
            Use Example SME mock images
          </Button>

          <ImageUploadControl
            id="organization-logo-upload"
            label="Company logo"
            hint="PNG or JPG, square logo recommended."
            previewUrl={logoPreview}
            error={logoError}
            onChange={(event) => void handleImageFile('logoImageUrl', event)}
            onClear={() => clearImage('logoImageUrl')}
          />
          <ImageUploadControl
            id="organization-banner-upload"
            label="Banner image"
            hint="PNG or JPG, wide banner recommended."
            previewUrl={bannerPreview}
            error={bannerError}
            banner
            onChange={(event) => void handleImageFile('bannerImageUrl', event)}
            onClear={() => clearImage('bannerImageUrl')}
          />

          <div className="form-actions">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save organization profile'}
            </Button>
          </div>
        </aside>
      </form>
    </>
  )
}

export function OrganizationProfilePreview({
  legalName,
  registrationNumber,
  logoImageUrl,
  bannerImageUrl,
  profileStatus,
}: {
  legalName: string
  registrationNumber?: string | null
  logoImageUrl: string
  bannerImageUrl: string
  profileStatus: string
}) {
  return (
    <article className="organization-profile-preview">
      <img
        className="organization-profile-preview__banner"
        src={bannerImageUrl}
        alt=""
      />
      <div className="organization-profile-preview__body">
        <img
          className="organization-profile-preview__logo"
          src={logoImageUrl}
          alt={`${legalName || 'Organization'} logo`}
        />
        <div>
          <span>{profileStatus}</span>
          <h2>{legalName || 'Organization profile'}</h2>
          <p>
            Registration: {registrationNumber?.trim() || 'Not provided'}
          </p>
        </div>
      </div>
    </article>
  )
}

function ImageUploadControl({
  id,
  label,
  hint,
  previewUrl,
  error,
  banner = false,
  onChange,
  onClear,
}: {
  id: string
  label: string
  hint: string
  previewUrl: string
  error: string | null
  banner?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  return (
    <div className="organization-profile-upload">
      <div className="organization-profile-upload__header">
        <label htmlFor={id}>{label}</label>
        <Button type="button" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <img
        className={
          banner
            ? 'organization-profile-upload__preview organization-profile-upload__preview--banner'
            : 'organization-profile-upload__preview'
        }
        src={previewUrl}
        alt={`${label} preview`}
      />
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg"
        onChange={onChange}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        aria-invalid={Boolean(error)}
      />
      <small id={`${id}-hint`} className="field-hint">
        {hint}
      </small>
      {error ? (
        <em id={`${id}-error`} className="field-error" role="alert">
          {error}
        </em>
      ) : null}
    </div>
  )
}

function defaultOrganizationProfileValues(): OrganizationProfileValues {
  return {
    legalName: '',
    registrationNumber: '',
    taxIdentifier: '',
    shariahProfile: '',
    deploymentMode: 'standalone_sme',
    logoImageUrl: '',
    bannerImageUrl: '',
  }
}

function valuesFromOrganization(
  organization: Organization,
): OrganizationProfileValues {
  return {
    legalName: organization.legalName,
    registrationNumber: organization.registrationNumber ?? '',
    taxIdentifier: organization.taxIdentifier ?? '',
    shariahProfile: organization.shariahProfile ?? '',
    deploymentMode: organization.deploymentMode as OrganizationProfileValues['deploymentMode'],
    logoImageUrl: organization.logoImageUrl ?? '',
    bannerImageUrl: organization.bannerImageUrl ?? '',
  }
}

function optionalProfileValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || null
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read image file'))
      }
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}
