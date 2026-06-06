import type { DemoGuideStep } from './demoGuide.manifest'
import type { DemoGuideProgressState } from './demoGuideProgress'

export type DemoGuideStepStatus =
  | 'Available'
  | 'Visited'
  | 'Reviewed'
  | 'Evidence-backed'
  | 'Environment-gated'

export function getDemoGuideStepStatus(
  step: DemoGuideStep,
  progress: DemoGuideProgressState,
): DemoGuideStepStatus {
  if (progress.reviewedStepIds.includes(step.id)) {
    return 'Reviewed'
  }

  if (step.completionMode === 'environment-gated') {
    return 'Environment-gated'
  }

  if (step.completionMode === 'evidence-backed') {
    return 'Evidence-backed'
  }

  if (progress.visitedStepIds.includes(step.id)) {
    return 'Visited'
  }

  return 'Available'
}

export function canAutoReviewDemoGuideStep(step: DemoGuideStep) {
  return step.completionMode !== 'environment-gated'
}
