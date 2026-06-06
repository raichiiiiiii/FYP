import { describe, expect, it } from 'vitest'

import {
  buildFabricRuntimeStatusCard,
  buildIntegrationStatusCards,
  type FabricRuntimeStatusSummary,
} from './integrationStatus.model'

const baseFabricStatus: FabricRuntimeStatusSummary = {
  enabled: true,
  mode: 'gateway',
  gatewayConfigured: true,
  gatewayMaterialReady: true,
  realGatewayAdapterImplemented: true,
  missingGatewayConfig: [],
  secretMaterial: {
    required: true,
    allPresent: true,
    files: {
      identityCert: 'present',
      privateKey: 'present',
      tlsCert: 'present',
    },
    missing: [],
  },
  latestRealAnchor: {
    present: true,
    status: 'VERIFIED',
    hasTransactionId: true,
    hasBlockNumber: true,
    channelRecorded: true,
    chaincodeRecorded: true,
    commitStatus: 'VALID',
    endorsementStatus: 'ENDORSED',
    anchoredAt: '2026-06-06T00:00:00.000Z',
    verifiedAt: '2026-06-06T00:01:00.000Z',
  },
  configuredChannel: 'configured',
  configuredChaincode: 'configured',
  configuredMspId: 'configured',
  submitTimeoutMs: 30000,
  commitTimeoutMs: 30000,
  securityBoundary: 'document hashes and minimal metadata only',
  message: 'Gateway material is present.',
}

describe('integration status model', () => {
  it('describes missing Fabric event evidence without claiming runtime config is missing', () => {
    const cards = buildIntegrationStatusCards({
      outbox: [],
      reconciliation: [],
      subscriptions: [],
    })

    expect(cards.find((card) => card.id === 'fabric')).toMatchObject({
      status: 'not_configured',
      message:
        'No Fabric anchor outbox or reconciliation evidence is available yet. Check Fabric runtime mode below for Gateway configuration and secret material readiness.',
    })
  })

  it('marks gateway material gaps as degraded', () => {
    const card = buildFabricRuntimeStatusCard({
      ...baseFabricStatus,
      gatewayMaterialReady: false,
      secretMaterial: {
        ...baseFabricStatus.secretMaterial,
        allPresent: false,
        files: {
          identityCert: 'present',
          privateKey: 'missing',
          tlsCert: 'present',
        },
        missing: ['private key'],
      },
      message: 'Gateway environment values are present.',
    })

    expect(card).toMatchObject({
      status: 'degraded',
      message:
        'Gateway environment is present, but mounted Fabric material is missing: private key.',
    })
  })

  it('marks gateway material with recorded anchor evidence as healthy', () => {
    expect(buildFabricRuntimeStatusCard(baseFabricStatus)).toMatchObject({
      status: 'healthy',
      message:
        'Gateway material is present and real Fabric anchor evidence exists. Use hash-record verification for full on-chain proof.',
    })
  })
})
