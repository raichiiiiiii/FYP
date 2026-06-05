import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IntegrationStatusCards } from './IntegrationStatusCards'
import {
  buildFabricRuntimeStatusCard,
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
    expect(statuses.find((status) => status.id === 'outbox')?.mode).toBe(
      'internal_queue',
    )
    expect(statuses.find((status) => status.id === 'erp')?.status).toBe(
      'not_configured',
    )
    expect(statuses.find((status) => status.id === 'erp')?.mode).toBe(
      'configuration_only',
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
    expect(fabric?.mode).toBe('mock_adapter')
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
    expect(erp?.mode).toBe('historical_reconciliation')
    expect(erp?.message).toContain('historical evidence')
  })

  it('marks operations production readiness as blocked without backup and storage probes', () => {
    const healthItems = buildOperationalHealthItems({
      health: healthyApi,
      outbox: [],
      workerHeartbeats: [
        {
          workerName: 'outbox-worker',
          queueName: 'outbox',
          status: 'idle',
          healthStatus: 'healthy',
          lastSeenAt: '2026-06-03T00:00:00.000Z',
          processedCount: 4,
          failedCount: 0,
          message: 'Worker is online and idle after its latest polling run.',
        },
      ],
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

  it('marks worker health as not configured when no heartbeat exists', () => {
    const healthItems = buildOperationalHealthItems({
      health: healthyApi,
      outbox: [],
    })

    expect(healthItems.find((item) => item.id === 'outbox-worker')?.status).toBe(
      'not_configured',
    )
  })

  it('marks worker health as degraded when queued integrations are failing', () => {
    const healthItems = buildOperationalHealthItems({
      health: healthyApi,
      outbox: [
        {
          eventType: 'FABRIC_ANCHOR_REQUESTED',
          displayStatus: 'FAILED',
          lastError: 'Fabric unavailable',
        },
      ],
      workerHeartbeats: [
        {
          workerName: 'outbox-worker',
          queueName: 'outbox',
          status: 'idle',
          healthStatus: 'healthy',
          lastSeenAt: '2026-06-03T00:00:00.000Z',
          processedCount: 4,
          failedCount: 1,
          message: 'Worker is online and idle after its latest polling run.',
        },
      ],
    })

    expect(healthItems.find((item) => item.id === 'outbox-worker')?.status).toBe(
      'degraded',
    )
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
    expect(html).toContain('Mock adapter')
    expect(html).toContain('not_configured')
  })

  it('maps mock Fabric runtime status without claiming real Gateway readiness', () => {
    const status = buildFabricRuntimeStatusCard({
      enabled: false,
      mode: 'mock',
      gatewayConfigured: false,
      realGatewayAdapterImplemented: false,
      missingGatewayConfig: [],
      configuredChannel: 'not_configured',
      configuredChaincode: 'not_configured',
      configuredMspId: 'not_configured',
      submitTimeoutMs: 30000,
      commitTimeoutMs: 30000,
      securityBoundary: 'document hashes and minimal metadata only',
      message:
        'Fabric anchoring is running in explicit mock mode for prototype and local testing.',
    })

    expect(status.status).toBe('not_configured')
    expect(status.mode).toBe('mock_adapter')
    expect(status.message).toContain('mock mode')
  })

  it('maps configured Gateway mode as pending until live anchor proof exists', () => {
    const status = buildFabricRuntimeStatusCard({
      enabled: true,
      mode: 'gateway',
      gatewayConfigured: true,
      realGatewayAdapterImplemented: true,
      missingGatewayConfig: [],
      configuredChannel: 'configured',
      configuredChaincode: 'configured',
      configuredMspId: 'configured',
      submitTimeoutMs: 30000,
      commitTimeoutMs: 30000,
      securityBoundary: 'document hashes and minimal metadata only',
      message:
        'Gateway mode is configured for the worker Fabric Gateway adapter. Real anchoring still requires deployed network material and successful worker processing.',
    })

    expect(status.status).toBe('pending')
    expect(status.mode).toBe('real_gateway_required')
    expect(status.message).toContain('Live anchor health')
  })

  it('maps missing Fabric status as unavailable', () => {
    const status = buildFabricRuntimeStatusCard(null)

    expect(status.status).toBe('unavailable')
    expect(status.mode).toBe('configuration_only')
    expect(status.message).toContain('could not be loaded')
  })
})
