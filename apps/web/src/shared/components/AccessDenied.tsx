import { PageHeader } from '../../layouts/PageHeader'

export function AccessDenied() {
  return (
    <>
      <PageHeader eyebrow="Permission check" title="Access denied" />
      <section className="access-denied-panel" aria-label="Access denied">
        <strong>Route permission blocked</strong>
        <p>
          Your current role cannot use this screen. Backend permission checks
          still remain the source of truth for protected actions.
        </p>
      </section>
    </>
  )
}
