import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  CreateEvidencePackInput,
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
}
