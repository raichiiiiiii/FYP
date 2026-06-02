import { PageHeader } from '../../layouts/PageHeader'

export function AccessDenied() {
  return (
    <>
      <PageHeader eyebrow="Permission check" title="Access denied" />
      <p className="notice">
        Your current role cannot use this screen. Backend permission checks still
        remain the source of truth for protected actions.
      </p>
    </>
  )
}
