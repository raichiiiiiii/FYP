import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditEventsService } from './audit-events.service';

@Controller('audit-events')
export class AuditEventsController {
  constructor(private readonly auditEventsService: AuditEventsService) {}

  @Get('entity/:entityType/:entityId')
  listEntityAuditEvents(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.auditEventsService.listByEntity({
      entityType,
      entityId,
      organizationId,
    });
  }

  @Get()
  listAuditEvents(
    @Query('organizationId') organizationId?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.auditEventsService.list({ organizationId, eventType });
  }
}
