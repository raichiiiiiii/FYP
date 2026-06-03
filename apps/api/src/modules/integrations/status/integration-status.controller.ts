import { Controller, Get, Param, Query } from '@nestjs/common';
import { IntegrationStatusService } from './integration-status.service';

@Controller('integrations')
export class IntegrationStatusController {
  constructor(private readonly integrationStatus: IntegrationStatusService) {}

  @Get('outbox')
  listOutbox(@Query('organizationId') organizationId?: string) {
    return this.integrationStatus.listOutbox(organizationId);
  }

  @Get('outbox/:id')
  getOutboxEvent(@Param('id') id: string) {
    return this.integrationStatus.getOutboxEvent(id);
  }

  @Get('reconciliation')
  listReconciliation(@Query('organizationId') organizationId?: string) {
    return this.integrationStatus.listReconciliation(organizationId);
  }

  @Get('fabric/status')
  getFabricStatus() {
    return this.integrationStatus.getFabricStatus();
  }
}
