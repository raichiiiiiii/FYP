import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ReportsService } from './reports.service';

type RequestReportExportBody = {
  organizationId?: string;
  actorUserId?: string;
  reportType?: string;
  format?: string;
  metadata?: unknown;
};

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

  @Post('exports')
  requestExport(@Body() body: RequestReportExportBody) {
    return this.reportsService.requestExport({
      organizationId: body.organizationId,
      actorUserId: body.actorUserId,
      reportType: body.reportType,
      format: body.format,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });
  }

  @Get('exports/:id')
  getExportJob(
    @Param('id') exportJobId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.reportsService.getExportJob({
      exportJobId,
      organizationId,
      actorUserId,
    });
  }

  @Get('exports/:id/download')
  async downloadExport(
    @Param('id') exportJobId: string,
    @Query('organizationId') organizationId: string | undefined,
    @Query('actorUserId') actorUserId: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const download = await this.reportsService.downloadExport({
      exportJobId,
      organizationId,
      actorUserId,
    });

    response.setHeader('Content-Type', download.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${download.fileName}"`,
    );

    return new StreamableFile(download.content);
  }
}
