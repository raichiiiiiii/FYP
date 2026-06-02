export function WorkflowStepper({
  steps,
  current,
  variant,
}: {
  steps: string[]
  current: string
  variant?: string
}) {
  const currentIndex = steps.indexOf(current)

  return (
    <div
      className={[
        'lifecycle-track',
        variant ? `lifecycle-track--${variant}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Workflow status ${current}`}
    >
      {currentIndex === -1 ? (
        <span className="active">{current}</span>
      ) : (
        steps.map((step, index) => (
          <span key={step} className={index <= currentIndex ? 'active' : ''}>
            {step}
          </span>
        ))
      )}
    </div>
  )
}
