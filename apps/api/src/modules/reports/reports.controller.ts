import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.reportsService.getSummary({ organizationId, actorUserId });
  }

  @Get('procurement')
  getProcurementReport(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.reportsService.getProcurementReport({
      organizationId,
      actorUserId,
    });
  }

  @Get('finance')
  getFinanceReport(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.reportsService.getFinanceReport({
      organizationId,
      actorUserId,
    });
  }

  @Get('audit')
  getAuditReport(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.reportsService.getAuditReport({ organizationId, actorUserId });
  }

  @Get('integrations')
  getIntegrationReport(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.reportsService.getIntegrationReport({
      organizationId,
      actorUserId,
    });
  }
}
