export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="state-box state-box--loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
