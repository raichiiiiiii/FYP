import { useCallback, useEffect, useState } from 'react'
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
import type { InboxItem, InboxResponse } from '../../shared/types'
import {
  formatInboxType,
  getInboxItemTone,
  inboxRoleRecipientOptions,
} from './inbox.model'

const messageSchema = z.object({
  recipientRoleCode: z.string().trim().min(1, 'Select a recipient group.'),
  subject: z.string().trim().min(1, 'Subject is required.'),
  body: z.string().trim().min(1, 'Message is required.'),
})

export function InboxRoute() {
  const { session } = useAppSession()
  const { notify } = useToast()
  const [inbox, setInbox] = useState<InboxResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const messageForm = useValidatedForm(messageSchema, {
    defaultValues: {
      recipientRoleCode: 'ORG_ADMIN',
      subject: '',
      body: '',
    },
  })

  const loadInbox = useCallback(async () => {
    if (!session.organizationId || !session.actorUserId) {
      setLoading(false)
      setMessage('Sign in with an organization context to open inbox.')
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      setInbox(
        await apiRequest<InboxResponse>(
          endpoints.inbox.list(session.organizationId, session.actorUserId),
        ),
      )
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load inbox'))
    } finally {
      setLoading(false)
    }
  }, [session.actorUserId, session.organizationId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadInbox(), 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadInbox])

  const submitMessage = messageForm.handleSubmit(async (values) => {
    if (!session.organizationId || !session.actorUserId) {
      setMessage('Active session is required.')
      return
    }

    try {
      await apiRequest(endpoints.inbox.messages, {
        method: 'POST',
        body: {
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
          recipientRoleCode: values.recipientRoleCode,
          subject: values.subject,
          body: values.body,
        },
      })
      messageForm.reset({
        recipientRoleCode: values.recipientRoleCode,
        subject: '',
        body: '',
      })
      notify({ type: 'success', message: 'Inbox message sent' })
      await loadInbox()
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Unable to send message')
      setMessage(errorMessage)
      notify({ type: 'error', message: errorMessage })
    }
  })

  async function markRead(item: InboxItem) {
    if (!session.organizationId || !session.actorUserId) {
      return
    }

    try {
      await apiRequest(endpoints.inbox.markRead(item.id), {
        method: 'POST',
        body: {
          organizationId: session.organizationId,
          actorUserId: session.actorUserId,
        },
      })
      await loadInbox()
    } catch (error) {
      notify({
        type: 'error',
        message: getErrorMessage(error, 'Unable to update inbox item'),
      })
    }
  }

  if (loading) {
    return <LoadingState message="Loading inbox..." />
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Inbox"
        action={
          <Button type="button" variant="secondary" onClick={() => void loadInbox()}>
            Refresh
          </Button>
        }
      />

      {message ? <ErrorState title="Inbox action failed" message={message} /> : null}

      <section className="inbox-layout">
        <section className="inbox-list" aria-labelledby="inbox-list-title">
          <div className="inbox-list__header">
            <div>
              <span className="eyebrow">Messages</span>
              <h2 id="inbox-list-title">Received and sent items</h2>
            </div>
            <strong className="inbox-unread-count">
              {inbox?.unreadCount ?? 0} unread
            </strong>
          </div>
          {inbox?.items.length ? (
            inbox.items.map((item) => (
              <article
                key={item.id}
                className={`inbox-item inbox-item--${getInboxItemTone(item)}`}
              >
                <div className="inbox-item__header">
                  <div>
                    <span>{formatInboxType(item.itemType)}</span>
                    <h3>{item.subject}</h3>
                  </div>
                  <strong>{item.status}</strong>
                </div>
                <p>{item.body}</p>
                <dl className="inbox-item__meta">
                  <div>
                    <dt>From</dt>
                    <dd>{item.sender?.displayName ?? item.senderUserId}</dd>
                  </div>
                  <div>
                    <dt>To</dt>
                    <dd>
                      {item.recipient?.displayName ??
                        item.recipientRoleCode ??
                        'Direct recipient'}
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(item.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
                {item.status === 'unread' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void markRead(item)}
                  >
                    Mark as read
                  </Button>
                ) : null}
              </article>
            ))
          ) : (
            <p className="empty-copy">
              No inbox items yet. Permission requests and user messages will
              appear here.
            </p>
          )}
        </section>

        <form
          className="inbox-compose"
          noValidate
          onSubmit={(event) => void submitMessage(event)}
        >
          <span className="eyebrow">Compose</span>
          <h2>Send a scoped message</h2>
          <p>
            Messages are organization-scoped and role-targeted. They do not
            grant access or change workflow state.
          </p>
          <SelectField
            label="Recipient group"
            name="recipientRoleCode"
            options={inboxRoleRecipientOptions}
            registration={messageForm.register('recipientRoleCode')}
            error={messageForm.formState.errors.recipientRoleCode?.message}
          />
          <FormField
            label="Subject"
            name="subject"
            registration={messageForm.register('subject')}
            error={messageForm.formState.errors.subject?.message}
          />
          <TextAreaField
            label="Message"
            name="body"
            rows={5}
            registration={messageForm.register('body')}
            error={messageForm.formState.errors.body?.message}
          />
          <Button type="submit" disabled={messageForm.formState.isSubmitting}>
            {messageForm.formState.isSubmitting ? 'Sending...' : 'Send message'}
          </Button>
        </form>
      </section>
    </>
  )
}
