import { getLifecycleSteps } from './applicationWorkspace.model'
import type { MudarabahApplicationStatus } from '../applications.types'

export function ApplicationTimeline({
  status,
}: {
  status: MudarabahApplicationStatus
}) {
  const steps = getLifecycleSteps(status)

  return (
    <section className="workspace-panel workspace-panel--wide">
      <div className="workspace-panel-header">
        <div>
          <span>Lifecycle</span>
          <h2>Status timeline</h2>
        </div>
      </div>
      <ol className="workspace-timeline" aria-label="Application lifecycle">
        {steps.map((step) => (
          <li
            className={`workspace-timeline-step workspace-timeline-step--${step.state}`}
            key={step.id}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
