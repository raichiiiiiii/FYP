import { Injectable } from '@nestjs/common';
import { readFabricEnv, type FabricEnv } from '../config/fabric-env';
import { FabricGatewayAnchorAdapter } from './fabric/fabric-gateway-anchor.adapter';
import { IntegrationAdapterError } from './integration-adapter-error';
import type { AdapterResult } from './integration-adapter.types';
import { MockFabricAnchorAdapter } from './mock-fabric-anchor.adapter';
import { MockIntegrationAdapters } from './mock-adapters';

@Injectable()
export class IntegrationAdapterRegistry {
  constructor(
    private readonly mockAdapters: MockIntegrationAdapters,
    private readonly mockFabric: MockFabricAnchorAdapter,
    private readonly fabricGateway: FabricGatewayAnchorAdapter,
  ) {}

  async dispatch(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<AdapterResult> {
    if (eventType !== 'FABRIC_ANCHOR_REQUESTED') {
      return this.mockAdapters.dispatch(eventType, payload);
    }

    let fabricEnv: FabricEnv;

    try {
      fabricEnv = readFabricEnv();
    } catch (error) {
      throw new IntegrationAdapterError(
        error instanceof Error
          ? error.message
          : 'Invalid Fabric Gateway configuration',
        'FABRIC_CONFIGURATION_ERROR',
        false,
      );
    }

    if (fabricEnv.mode === 'gateway') {
      return this.fabricGateway.anchor(payload);
    }

    return this.mockFabric.anchor(payload);
  }
}
