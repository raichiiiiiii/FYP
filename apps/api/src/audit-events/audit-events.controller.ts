import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditEventsService } from './audit-events.service';

@Controller('audit-events')
export class AuditEventsController {
  constructor(private readonly auditEventsService: AuditEventsService) {}

  @Get('search')
  searchAuditEvents(
    @Query('organizationId') organizationId?: string,
    @Query('eventType') eventType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditEventsService.search({
      organizationId,
      eventType,
      actorUserId,
      entityType,
      entityId,
      from,
      to,
      page,
      pageSize,
    });
  }

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
    @Query('actorUserId') actorUserId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditEventsService.list({
      organizationId,
      eventType,
      actorUserId,
      entityType,
      entityId,
      from,
      to,
    });
  }
}
