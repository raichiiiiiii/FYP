export function ErrorState({
  title = 'Something went wrong',
  message,
}: {
  title?: string
  message: string
}) {
  return (
    <div className="state-box state-box--error">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
