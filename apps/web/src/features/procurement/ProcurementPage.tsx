import { useCallback, useEffect, useState } from 'react'

import { PageHeader } from '../../layouts/PageHeader'
import { ErrorState } from '../../shared/components/ErrorState'
import { LoadingState } from '../../shared/components/LoadingState'
import type { AppRoleCode, AppSession, LoadState } from '../../shared/types'
import { useRequisitions } from './api/useRequisitions'
import { RequisitionList } from './requisitions/RequisitionList'
import type {
  RequisitionAction,
  RequisitionRecord,
} from './requisitions/requisition.types'

export function ProcurementPage({
  session,
  navigate,
  roleCodes,
}: {
  session: AppSession
  navigate: (path: string) => void
  roleCodes: readonly AppRoleCode[]
}) {
  const { listRequisitions, transitionRequisition } = useRequisitions(session)
  const [state, setState] = useState<LoadState<RequisitionRecord[]>>({
    status: 'loading',
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadRequisitions = useCallback(
    () => listRequisitions<RequisitionRecord>(),
    [listRequisitions],
  )

  const refresh = useCallback(async () => {
    setState({ status: 'ready', data: await loadRequisitions() })
  }, [loadRequisitions])

  useEffect(() => {
    let cancelled = false

    loadRequisitions()
      .then((rows) => {
        if (!cancelled) {
          setState({ status: 'ready', data: rows })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to load procurement requisitions',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadRequisitions])

  async function transition(id: string, action: RequisitionAction) {
    setIsUpdating(true)
    setMessage(null)

    try {
      await transitionRequisition<RequisitionRecord>(id, action, {
        actorUserId: session.actorUserId,
        ...(action === 'submit'
          ? {}
          : { approverUserId: session.actorUserId }),
      })
      await refresh()
      setMessage(`Requisition ${action} complete.`)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to update requisition',
      )
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Procurement workflow"
        title="Source-to-pay foundation"
        action={
          <button
            type="button"
            onClick={() => navigate('/procurement/requisitions/new')}
          >
            New requisition
          </button>
        }
      />
      <p className="notice">
        This slice focuses on requisition capture and approval readiness. RFQ,
        PO, receipt, invoice, matching, and evidence-linking remain in later
        procurement slices.
      </p>

      {message ? <p className="notice">{message}</p> : null}
      {state.status === 'loading' ? (
        <LoadingState message="Loading procurement requisitions..." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState
          title="Unable to load procurement workflow"
          message={state.message}
        />
      ) : null}
      {state.status === 'ready' ? (
        <RequisitionList
          requisitions={state.data}
          roleCodes={roleCodes}
          actorUserId={session.actorUserId}
          isUpdating={isUpdating}
          onCreate={() => navigate('/procurement/requisitions/new')}
          onOpen={(id) => navigate(`/procurement/requisitions/${id}`)}
          onTransition={(id, action) => void transition(id, action)}
        />
      ) : null}
    </>
  )
}
