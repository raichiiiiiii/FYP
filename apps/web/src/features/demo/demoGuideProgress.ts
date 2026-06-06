export const DEMO_GUIDE_PROGRESS_STORAGE_KEY = 'mepn.demoGuide.progress.v1'

export type DemoGuideProgressState = {
  reviewedStepIds: string[]
  visitedStepIds: string[]
  collapsed: boolean
}

type BrowserLikeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const emptyDemoGuideProgress: DemoGuideProgressState = {
  reviewedStepIds: [],
  visitedStepIds: [],
  collapsed: true,
}

export function readDemoGuideProgress(
  storage: BrowserLikeStorage | undefined = getBrowserStorage(),
): DemoGuideProgressState {
  if (!storage) {
    return emptyDemoGuideProgress
  }

  try {
    const rawProgress = storage.getItem(DEMO_GUIDE_PROGRESS_STORAGE_KEY)

    if (!rawProgress) {
      return emptyDemoGuideProgress
    }

    return normalizeDemoGuideProgress(JSON.parse(rawProgress))
  } catch {
    return emptyDemoGuideProgress
  }
}

export function writeDemoGuideProgress(
  progress: DemoGuideProgressState,
  storage: BrowserLikeStorage | undefined = getBrowserStorage(),
) {
  if (!storage) {
    return
  }

  storage.setItem(
    DEMO_GUIDE_PROGRESS_STORAGE_KEY,
    JSON.stringify(normalizeDemoGuideProgress(progress)),
  )
}

export function resetDemoGuideProgress(
  storage: BrowserLikeStorage | undefined = getBrowserStorage(),
) {
  if (!storage) {
    return
  }

  storage.removeItem(DEMO_GUIDE_PROGRESS_STORAGE_KEY)
}

export function setDemoGuideCollapsed(
  progress: DemoGuideProgressState,
  collapsed: boolean,
): DemoGuideProgressState {
  return normalizeDemoGuideProgress({ ...progress, collapsed })
}

export function toggleDemoGuideReviewedStep(
  progress: DemoGuideProgressState,
  stepId: string,
): DemoGuideProgressState {
  const reviewedStepIds = new Set(progress.reviewedStepIds)

  if (reviewedStepIds.has(stepId)) {
    reviewedStepIds.delete(stepId)
  } else {
    reviewedStepIds.add(stepId)
  }

  return normalizeDemoGuideProgress({
    ...progress,
    reviewedStepIds: [...reviewedStepIds],
  })
}

export function markDemoGuideVisitedStep(
  progress: DemoGuideProgressState,
  stepId: string,
): DemoGuideProgressState {
  return normalizeDemoGuideProgress({
    ...progress,
    visitedStepIds: [...progress.visitedStepIds, stepId],
  })
}

export function normalizeDemoGuideProgress(
  value: unknown,
): DemoGuideProgressState {
  if (!isProgressLike(value)) {
    return emptyDemoGuideProgress
  }

  return {
    reviewedStepIds: uniqueStrings(value.reviewedStepIds),
    visitedStepIds: uniqueStrings(value.visitedStepIds),
    collapsed:
      typeof value.collapsed === 'boolean'
        ? value.collapsed
        : emptyDemoGuideProgress.collapsed,
  }
}

function isProgressLike(value: unknown): value is Partial<DemoGuideProgressState> {
  return typeof value === 'object' && value !== null
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.filter((item): item is string => typeof item === 'string'))]
}

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.localStorage
}
