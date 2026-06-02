import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type {
  CreateEvidencePackInput,
  EvidencePackExportFormat,
  ExportEvidencePackInput,
} from './evidence-packs.service';
import { EvidencePacksService } from './evidence-packs.service';

@Controller('evidence-packs')
export class EvidencePacksController {
  constructor(private readonly evidencePacksService: EvidencePacksService) {}

  @Post()
  createEvidencePack(@Body() body: CreateEvidencePackInput) {
    return this.evidencePacksService.create(body);
  }

  @Get()
  listEvidencePacks(@Query('organizationId') organizationId?: string) {
    return this.evidencePacksService.list(organizationId);
  }

  @Get(':id')
  getEvidencePack(@Param('id') id: string) {
    return this.evidencePacksService.getById(id);
  }

  @Post(':id/export')
  exportEvidencePack(
    @Param('id') id: string,
    @Body() body: ExportEvidencePackInput,
  ) {
    return this.evidencePacksService.export(id, body);
  }

  @Get(':id/export/download')
  async downloadEvidencePackExport(
    @Param('id') id: string,
    @Query('format') format: EvidencePackExportFormat = 'json',
    @Query('actorUserId') actorUserId: string | undefined,
    @Res() response: Response,
  ) {
    const artifact = await this.evidencePacksService.exportArtifact(
      id,
      format === 'pdf' ? 'pdf' : 'json',
      { actorUserId },
    );

    response.setHeader('Content-Type', artifact.contentType);
    response.setHeader('Content-Length', String(artifact.content.length));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${artifact.fileName.replace(/"/g, '')}"`,
    );
    response.send(artifact.content);
  }
}
