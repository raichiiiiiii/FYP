import { demoGuideSteps } from './demoGuide.manifest'

export function getActiveDemoGuideStep(pathname: string) {
  return (
    demoGuideSteps.find((step) => step.route === pathname) ??
    demoGuideSteps.find(
      (step) => step.route !== '/' && pathname.startsWith(`${step.route}/`),
    ) ??
    null
  )
}
