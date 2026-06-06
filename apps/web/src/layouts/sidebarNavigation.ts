import type { AppModule, AppRouteMetadata } from '../app/navigation'

export function groupSidebarRoutesByModule(
  routes: readonly AppRouteMetadata[],
) {
  return [...new Set(routes.map((route) => route.module))].map((module) => ({
    module,
    routes: routes.filter((route) => route.module === module),
  }))
}

export function getActiveSidebarModule(
  routes: readonly AppRouteMetadata[],
  pathname: string,
) {
  return (
    routes.find((route) => isRouteActive(route.path, pathname))?.module ?? null
  )
}

export function getSidebarModuleId(module: AppModule) {
  return module.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function isRouteActive(routePath: string, pathname: string) {
  return pathname === routePath || pathname.startsWith(`${routePath}/`)
}
