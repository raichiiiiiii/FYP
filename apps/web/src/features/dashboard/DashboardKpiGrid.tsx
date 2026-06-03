import type { DashboardKpi } from './dashboard.types'

export function DashboardKpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <section className="dashboard-kpi-grid" aria-label="Role KPIs">
      {kpis.map((kpi) => (
        <article
          key={kpi.id}
          className={`dashboard-kpi-card dashboard-kpi-card--${
            kpi.severity ?? 'neutral'
          }`}
        >
          <span>{kpi.label}</span>
          <strong>{kpi.value}</strong>
          <p>{kpi.helper}</p>
          {kpi.trend ? <em>{trendLabel(kpi.trend)}</em> : null}
        </article>
      ))}
    </section>
  )
}

function trendLabel(trend: DashboardKpi['trend']) {
  if (trend === 'up') {
    return 'Trending up'
  }

  if (trend === 'down') {
    return 'Trending down'
  }

  return 'Stable'
}
