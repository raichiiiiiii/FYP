import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FabricGatewayAnchorAdapter } from '../integrations/fabric/fabric-gateway-anchor.adapter';
import { IntegrationAdapterRegistry } from '../integrations/integration-adapter-registry';
import { MockFabricAnchorAdapter } from '../integrations/mock-fabric-anchor.adapter';
import { MockIntegrationAdapters } from '../integrations/mock-adapters';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    MockIntegrationAdapters,
    MockFabricAnchorAdapter,
    FabricGatewayAnchorAdapter,
    IntegrationAdapterRegistry,
    OutboxWorkerService,
  ],
  exports: [OutboxWorkerService],
})
export class OutboxWorkerModule {}
