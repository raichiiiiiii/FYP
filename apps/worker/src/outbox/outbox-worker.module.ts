import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FabricGatewayAnchorAdapter } from '../integrations/fabric/fabric-gateway-anchor.adapter';
import { FabricGatewayClientFactory } from '../integrations/fabric/fabric-gateway-client.factory';
import { IntegrationAdapterRegistry } from '../integrations/integration-adapter-registry';
import { MockFabricAnchorAdapter } from '../integrations/mock-fabric-anchor.adapter';
import { MockIntegrationAdapters } from '../integrations/mock-adapters';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    MockIntegrationAdapters,
    MockFabricAnchorAdapter,
    FabricGatewayClientFactory,
    FabricGatewayAnchorAdapter,
    IntegrationAdapterRegistry,
    OutboxWorkerService,
  ],
  exports: [OutboxWorkerService],
})
export class OutboxWorkerModule {}
