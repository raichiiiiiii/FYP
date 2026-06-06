import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { DemoGuideToggle } from './DemoGuideToggle'
import { demoGuideSteps, type DemoGuideStep } from './demoGuide.manifest'
import {
  readDemoGuideProgress,
  resetDemoGuideProgress,
  setDemoGuideCollapsed,
  toggleDemoGuideReviewedStep,
  writeDemoGuideProgress,
  type DemoGuideProgressState,
} from './demoGuideProgress'
import { getActiveDemoGuideStep } from './demoGuideRoute'

export function DemoGuideOverlay() {
  const location = useLocation()
  const [progress, setProgress] = useState<DemoGuideProgressState>(() =>
    readDemoGuideProgress(),
  )

  useEffect(() => {
    writeDemoGuideProgress(progress)
  }, [progress])

  const activeStepId = useMemo(
    () => getActiveDemoGuideStep(location.pathname)?.id ?? null,
    [location.pathname],
  )
  const reviewedStepIds = new Set(progress.reviewedStepIds)
  const reviewedCount = progress.reviewedStepIds.length
  const expanded = !progress.collapsed

  return (
    <aside className="demo-guide" aria-label="Guided demo checklist">
      <DemoGuideToggle
        expanded={expanded}
        reviewedCount={reviewedCount}
        totalCount={demoGuideSteps.length}
        onToggle={() =>
          setProgress((current) =>
            setDemoGuideCollapsed(current, !current.collapsed),
          )
        }
      />

      {expanded ? (
        <DemoGuidePanel
          activeStepId={activeStepId}
          reviewedStepIds={reviewedStepIds}
          onToggleReviewed={(stepId) =>
            setProgress((current) =>
              toggleDemoGuideReviewedStep(current, stepId),
            )
          }
          onReset={() => {
            resetDemoGuideProgress()
            setProgress(readDemoGuideProgress())
          }}
        />
      ) : null}
    </aside>
  )
}

type DemoGuidePanelProps = {
  activeStepId: string | null
  reviewedStepIds: ReadonlySet<string>
  onToggleReviewed: (stepId: string) => void
  onReset: () => void
}

export function DemoGuidePanel({
  activeStepId,
  reviewedStepIds,
  onToggleReviewed,
  onReset,
}: DemoGuidePanelProps) {
  return (
    <section id="demo-guide-panel" className="demo-guide-panel">
      <div className="demo-guide-header">
        <div>
          <span>Reviewer path</span>
          <h2>Guided demo mode</h2>
          <p>
            Follow the review route without creating records or overriding
            workflow state.
          </p>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      <ol className="demo-guide-steps">
        {demoGuideSteps.map((step) => (
          <DemoGuideStepItem
            key={step.id}
            active={activeStepId === step.id}
            reviewed={reviewedStepIds.has(step.id)}
            step={step}
            onToggleReviewed={onToggleReviewed}
          />
        ))}
      </ol>
    </section>
  )
}

type DemoGuideStepItemProps = {
  active: boolean
  reviewed: boolean
  step: DemoGuideStep
  onToggleReviewed: (stepId: string) => void
}

function DemoGuideStepItem({
  active,
  reviewed,
  step,
  onToggleReviewed,
}: DemoGuideStepItemProps) {
  const checkboxId = `demo-guide-reviewed-${step.id}`

  return (
    <li
      className={
        active
          ? 'demo-guide-step demo-guide-step--active'
          : 'demo-guide-step'
      }
    >
      <div className="demo-guide-step__topline">
        <span className="demo-guide-step__area">{step.featureArea}</span>
        <span className={`demo-guide-step__risk demo-guide-step__risk--${step.riskLevel}`}>
          {formatDemoGuideRisk(step.riskLevel)}
        </span>
      </div>

      <div className="demo-guide-step__title-row">
        <label htmlFor={checkboxId}>
          <input
            id={checkboxId}
            type="checkbox"
            checked={reviewed}
            onChange={() => onToggleReviewed(step.id)}
          />
          <span>{step.title}</span>
        </label>
        {active ? <strong>Current route</strong> : null}
      </div>

      <p>{step.shortDescription}</p>
      <p className="demo-guide-step__notes">{step.reviewerNotes}</p>

      <div className="demo-guide-step__actions">
        <Link to={step.route}>Open route</Link>
        {step.evidenceLinks.slice(0, 2).map((link) => (
          <a key={link} href={`/${link}`} target="_blank" rel="noreferrer">
            Evidence
          </a>
        ))}
      </div>
    </li>
  )
}

function formatDemoGuideRisk(riskLevel: DemoGuideStep['riskLevel']) {
  switch (riskLevel) {
    case 'environment-gated':
      return 'Environment-gated'
    case 'medium':
      return 'Workflow-sensitive'
    case 'low':
      return 'Low risk'
  }
}
