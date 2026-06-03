import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IntegrationStatusCards } from './IntegrationStatusCards'
import {
  buildIntegrationStatusCards,
  buildOperationalHealthItems,
  summarizeOperationalHealth,
} from './integrationStatus.model'
import type { HealthResponse } from '../../../shared/types'

const healthyApi: HealthResponse = {
  status: 'ok',
  service: 'mepn-api',
  database: 'ok',
  redis: 'ok',
  environment: 'test',
  timestamp: '2026-06-03T00:00:00.000Z',
}

describe('integration and operations status model', () => {
  it('does not claim external adapters are healthy without evidence', () => {
    const statuses = buildIntegrationStatusCards({
      outbox: [],
      reconciliation: [],
      subscriptions: [],
    })

    expect(statuses.find((status) => status.id === 'outbox')?.status).toBe(
      'healthy',
    )
    expect(statuses.find((status) => status.id === 'erp')?.status).toBe(
      'not_configured',
    )
    expect(statuses.find((status) => status.id === 'fabric')?.status).toBe(
      'not_configured',
    )
    expect(statuses.find((status) => status.id === 'webhook')?.status).toBe(
      'not_configured',
    )
  })

  it('renders failed Fabric outbox events as degraded', () => {
    const statuses = buildIntegrationStatusCards({
      outbox: [
        {
          eventType: 'FABRIC_ANCHOR_REQUESTED',
          displayStatus: 'FAILED',
          lastError: 'Fabric gateway timeout',
          updatedAt: '2026-06-03T01:00:00.000Z',
        },
      ],
      reconciliation: [],
      subscriptions: [],
    })

    const fabric = statuses.find((status) => status.id === 'fabric')

    expect(fabric?.status).toBe('degraded')
    expect(fabric?.message).toBe('Fabric gateway timeout')
    expect(statuses.find((status) => status.id === 'outbox')?.status).toBe(
      'degraded',
    )
  })

  it('uses reconciliation success as explicit historical evidence', () => {
    const statuses = buildIntegrationStatusCards({
      outbox: [],
      reconciliation: [
        {
          integrationType: 'ERP',
          status: 'RECONCILED',
          externalReference: 'ERP-PO-100',
          updatedAt: '2026-06-03T02:00:00.000Z',
        },
      ],
      subscriptions: [],
    })

    const erp = statuses.find((status) => status.id === 'erp')

    expect(erp?.status).toBe('healthy')
    expect(erp?.evidence).toBe('reconciliation')
    expect(erp?.message).toContain('historical evidence')
  })

  it('marks operations production readiness as blocked without backup and storage probes', () => {
    const healthItems = buildOperationalHealthItems({
      health: healthyApi,
      outbox: [],
    })
    const readiness = summarizeOperationalHealth(healthItems)

    expect(healthItems.find((item) => item.id === 'api')?.status).toBe(
      'healthy',
    )
    expect(healthItems.find((item) => item.id === 'backup-restore')?.status).toBe(
      'not_configured',
    )
    expect(healthItems.find((item) => item.id === 'object-storage')?.status).toBe(
      'not_configured',
    )
    expect(readiness.productionReady).toBe(false)
  })

  it('surfaces dependency failures from the API health response', () => {
    const healthItems = buildOperationalHealthItems({
      health: {
        ...healthyApi,
        status: 'degraded',
        database: 'error',
      },
      outbox: [],
    })

    expect(healthItems.find((item) => item.id === 'api')?.status).toBe(
      'degraded',
    )
    expect(healthItems.find((item) => item.id === 'postgres')?.status).toBe(
      'unavailable',
    )
  })

  it('renders status cards with honest status labels', () => {
    const html = renderToStaticMarkup(
      <IntegrationStatusCards
        statuses={buildIntegrationStatusCards({
          outbox: [
            {
              eventType: 'ERP_SYNC_REQUESTED',
              displayStatus: 'RETRYING',
              attempts: 2,
              updatedAt: '2026-06-03T03:00:00.000Z',
            },
          ],
          reconciliation: [],
          subscriptions: [],
        })}
      />,
    )

    expect(html).toContain('ERP adapter')
    expect(html).toContain('Degraded')
    expect(html).toContain('not_configured')
  })
})
