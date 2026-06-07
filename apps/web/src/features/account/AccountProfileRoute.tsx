import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
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
import type { AccountProfile } from '../../shared/types'
import { useAuth } from '../auth/useAuth'
import {
  accountProfileImageMaxBytes,
  accountPasswordMinLength,
  formatAccessCode,
  isValidLocalPasswordLength,
  isSupportedAccountProfileImage,
  requestableRoleOptions,
} from './accountProfile.model'

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.'),
  profileImageUrl: z.string().optional(),
})

const permissionRequestSchema = z.object({
  requestedRoleCode: z.string().trim().min(1, 'Select a role to request.'),
  reason: z.string().trim().min(1, 'Reason is required.'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .refine(isValidLocalPasswordLength, {
        message: `Use at least ${accountPasswordMinLength} characters.`,
      }),
    confirmPassword: z.string().min(1, 'Confirm the new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'New password and confirmation must match.',
  })

export function AccountProfileRoute() {
  const { session } = useAppSession()
  const { authSession, refreshSession } = useAuth()
  const { notify } = useToast()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const profileForm = useValidatedForm(profileSchema, {
    defaultValues: {
      displayName: '',
      profileImageUrl: '',
    },
  })
  const requestForm = useValidatedForm(permissionRequestSchema, {
    defaultValues: {
      requestedRoleCode: '',
      reason: '',
    },
  })
  const passwordForm = useValidatedForm(passwordSchema, {
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })
  const profileImageUrl = profileForm.watch('profileImageUrl')
  const localPasswordEnabled = authSession?.passwordAuthEnabled ?? false

  const applyProfile = useCallback(
    (loaded: AccountProfile) => {
      setProfile(loaded)
      profileForm.reset({
        displayName: loaded.displayName,
        profileImageUrl: loaded.profileImageUrl ?? '',
      })
    },
    [profileForm],
  )

  const loadProfile = useCallback(async () => {
    if (!session.organizationId || !session.actorUserId) {
      setLoading(false)
      setMessage('Sign in with an organization context to manage your profile.')
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      const loaded = await apiRequest<AccountProfile>(
        endpoints.account.profile(session.organizationId, session.actorUserId),
      )
      applyProfile(loaded)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load account profile'))
    } finally {
      setLoading(false)
    }
  }, [applyProfile, session.actorUserId, session.organizationId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadProfile(), 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProfile])

  const submitProfile = profileForm.handleSubmit(async (values) => {
    if (!session.organizationId || !session.actorUserId) {
      setMessage('Active session is required.')
      return
    }

    try {
      setMessage(null)
      const updated = await apiRequest<AccountProfile>(
        endpoints.account.updateProfile,
        {
          method: 'PATCH',
          body: {
            organizationId: session.organizationId,
            actorUserId: session.actorUserId,
            displayName: values.displayName,
            profileImageUrl: values.profileImageUrl?.trim() || null,
          },
        },
      )
      applyProfile(updated)
      await refreshSession()
      notify({ type: 'success', message: 'Account profile updated' })
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Unable to update profile')
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  const submitPermissionRequest = requestForm.handleSubmit(async (values) => {
    if (!session.organizationId || !session.actorUserId) {
      setMessage('Active session is required.')
      return
    }

    try {
      setMessage(null)
      await apiRequest(endpoints.inbox.permissionRequests, {
        method: 'POST',
        body: {
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
          requestedRoleCode: values.requestedRoleCode,
          reason: values.reason,
        },
      })
      requestForm.reset({
        requestedRoleCode: '',
        reason: '',
      })
      notify({
        type: 'success',
        message: 'Permission request sent to organization admins',
      })
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        'Unable to send permission request',
      )
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  const submitPassword = passwordForm.handleSubmit(async (values) => {
    if (!session.organizationId || !session.actorUserId) {
      setMessage('Active session is required.')
      return
    }

    try {
      setMessage(null)
      await apiRequest(endpoints.account.updatePassword, {
        method: 'PATCH',
        body: {
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      })
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      notify({ type: 'success', message: 'Local password updated' })
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Unable to update password')
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  async function handleProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!isSupportedAccountProfileImage(file)) {
      setImageError('Use a PNG or JPG profile picture.')
      event.target.value = ''
      return
    }

    if (file.size > accountProfileImageMaxBytes) {
      setImageError('Use an image smaller than 1 MB.')
      event.target.value = ''
      return
    }

    setImageError(null)
    profileForm.setValue('profileImageUrl', await readFileAsDataUrl(file), {
      shouldDirty: true,
    })
  }

  if (loading) {
    return <LoadingState message="Loading account profile..." />
  }

  if (!profile && message) {
    return <ErrorState title="Account profile unavailable" message={message} />
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Manage profile"
        action={
          <Button type="button" variant="secondary" onClick={() => void loadProfile()}>
            Refresh
          </Button>
        }
      />

      {message ? <ErrorState title="Account action failed" message={message} /> : null}

      <section className="account-profile-layout">
        <form
          className="account-card account-profile-card"
          noValidate
          onSubmit={(event) => void submitProfile(event)}
        >
          <div className="account-profile-card__header">
            <ProfileAvatar
              displayName={profileForm.watch('displayName') || profile?.displayName || ''}
              profileImageUrl={profileImageUrl}
            />
            <div>
              <span className="eyebrow">Profile</span>
              <h2>{profile?.email}</h2>
              <p>Update your visible account display name and profile picture.</p>
            </div>
          </div>
          <FormField
            label="Display name"
            name="displayName"
            required
            registration={profileForm.register('displayName')}
            error={profileForm.formState.errors.displayName?.message}
          />
          <FormField
            label="Profile picture URL"
            name="profileImageUrl"
            registration={profileForm.register('profileImageUrl')}
            error={profileForm.formState.errors.profileImageUrl?.message}
            hint="PNG or JPG image URL/reference. Upload below stores a local data preview reference."
          />
          <label className="field" htmlFor="account-profile-image-upload">
            <span>Upload profile picture</span>
            <input
              id="account-profile-image-upload"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => void handleProfileImage(event)}
              aria-invalid={Boolean(imageError)}
            />
            {imageError ? (
              <em className="field-error" role="alert">
                {imageError}
              </em>
            ) : null}
          </label>
          <div className="form-actions">
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? 'Saving...' : 'Save profile'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => profileForm.setValue('profileImageUrl', '', { shouldDirty: true })}
            >
              Clear picture
            </Button>
          </div>
        </form>

        {localPasswordEnabled ? (
          <form
            className="account-card"
            noValidate
            onSubmit={(event) => void submitPassword(event)}
          >
            <span className="eyebrow">Local/UAT credentials</span>
            <h2>Change password</h2>
            <p>
              This updates the local seeded-password credential for this
              self-hosted node. Production deployments should use the configured
              identity provider unless local password login is explicitly
              enabled.
            </p>
            <FormField
              label="Current password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              registration={passwordForm.register('currentPassword')}
              error={passwordForm.formState.errors.currentPassword?.message}
            />
            <FormField
              label="New password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              registration={passwordForm.register('newPassword')}
              error={passwordForm.formState.errors.newPassword?.message}
            />
            <FormField
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              registration={passwordForm.register('confirmPassword')}
              error={passwordForm.formState.errors.confirmPassword?.message}
            />
            <div className="form-actions">
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting
                  ? 'Updating...'
                  : 'Update password'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  passwordForm.reset({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })
                }
              >
                Clear
              </Button>
            </div>
          </form>
        ) : (
          <section className="account-card" aria-labelledby="local-password-disabled-title">
            <span className="eyebrow">Local/UAT credentials</span>
            <h2 id="local-password-disabled-title">Password login disabled</h2>
            <p>
              This node is not currently accepting local seeded-password login.
              Use the configured identity provider, or enable the local password
              boundary explicitly for UAT/demo use.
            </p>
          </section>
        )}

        <section className="account-card" aria-labelledby="account-access-title">
          <span className="eyebrow">Access</span>
          <h2 id="account-access-title">Current roles and permissions</h2>
          <div className="account-access-grid">
            <div>
              <h3>Roles</h3>
              <ul>
                {profile?.roleCodes.map((roleCode) => (
                  <li key={roleCode}>{formatAccessCode(roleCode)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Permissions</h3>
              <ul>
                {(profile?.permissionCodes.length
                  ? profile.permissionCodes
                  : ['No explicit permissions loaded']
                ).map((permissionCode) => (
                  <li key={permissionCode}>{formatAccessCode(permissionCode)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <form
          className="account-card"
          noValidate
          onSubmit={(event) => void submitPermissionRequest(event)}
        >
          <span className="eyebrow">Request</span>
          <h2>Request permission from admins</h2>
          <p>
            Requests are sent to organization admins through the inbox. Access is
            not granted until an admin updates your membership.
          </p>
          <SelectField
            label="Requested role"
            name="requestedRoleCode"
            placeholder="Select role"
            options={requestableRoleOptions}
            registration={requestForm.register('requestedRoleCode')}
            error={requestForm.formState.errors.requestedRoleCode?.message}
          />
          <TextAreaField
            label="Reason"
            name="reason"
            rows={4}
            registration={requestForm.register('reason')}
            error={requestForm.formState.errors.reason?.message}
          />
          <div className="form-actions">
            <Button type="submit" disabled={requestForm.formState.isSubmitting}>
              {requestForm.formState.isSubmitting ? 'Sending...' : 'Send request'}
            </Button>
            <Link className="button button--secondary" to="/inbox">
              Open inbox
            </Link>
          </div>
        </form>
      </section>
    </>
  )
}

function ProfileAvatar({
  displayName,
  profileImageUrl,
}: {
  displayName: string
  profileImageUrl?: string | null
}) {
  if (profileImageUrl) {
    return (
      <img
        className="account-profile-avatar"
        src={profileImageUrl}
        alt={`${displayName || 'Account'} profile`}
      />
    )
  }

  return (
    <span className="account-profile-avatar account-profile-avatar--initials">
      {displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase() || 'A'}
    </span>
  )
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
