import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { OutboxModule } from '../outbox/outbox.module';
import { ErpSyncController } from './erp/erp-sync.controller';
import { ErpSyncService } from './erp/erp-sync.service';
import { MockErpAdapter } from './erp/mock-erp.adapter';
import { EsignPackageController } from './esign/esign-package.controller';
import { EsignPackageService } from './esign/esign-package.service';
import { MockEsignAdapter } from './esign/mock-esign.adapter';
import { FabricAnchorController } from './fabric/fabric-anchor.controller';
import { FabricAnchorService } from './fabric/fabric-anchor.service';
import { MockFabricAnchorAdapter } from './fabric/mock-fabric-anchor.adapter';
import { FinanceApiNotificationController } from './finance-api/finance-api-notification.controller';
import { FinanceApiNotificationService } from './finance-api/finance-api-notification.service';
import { MockFinanceApiAdapter } from './finance-api/mock-finance-api.adapter';
import { IntegrationRequestAuditService } from './integration-request-audit.service';
import { IntegrationStatusController } from './status/integration-status.controller';
import { IntegrationStatusService } from './status/integration-status.service';
import { WebhookDeliveryService } from './webhooks/webhook-delivery.service';
import { WebhookSubscriptionService } from './webhooks/webhook-subscription.service';
import { WebhooksController } from './webhooks/webhooks.controller';

@Module({
  imports: [DatabaseModule, OutboxModule, AuditEventsModule],
  controllers: [
    ErpSyncController,
    FabricAnchorController,
    FinanceApiNotificationController,
    EsignPackageController,
    WebhooksController,
    IntegrationStatusController,
  ],
  providers: [
    IntegrationRequestAuditService,
    IntegrationStatusService,
    ErpSyncService,
    MockErpAdapter,
    FabricAnchorService,
    MockFabricAnchorAdapter,
    FinanceApiNotificationService,
    MockFinanceApiAdapter,
    EsignPackageService,
    MockEsignAdapter,
    WebhookSubscriptionService,
    WebhookDeliveryService,
  ],
  exports: [
    ErpSyncService,
    FabricAnchorService,
    FinanceApiNotificationService,
    EsignPackageService,
    WebhookSubscriptionService,
    WebhookDeliveryService,
  ],
})
export class IntegrationsModule {}
