import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateEvidenceItemInput } from './evidence-items.service';
import { EvidenceItemsService } from './evidence-items.service';

@Controller('evidence-items')
export class EvidenceItemsController {
  constructor(private readonly evidenceItemsService: EvidenceItemsService) {}

  @Post()
  createEvidenceItem(@Body() body: CreateEvidenceItemInput) {
    return this.evidenceItemsService.create(body);
  }

  @Get()
  listEvidenceItems(
    @Query('organizationId') organizationId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('evidencePackId') evidencePackId?: string,
  ) {
    return this.evidenceItemsService.list({
      organizationId,
      entityType,
      entityId,
      evidencePackId,
    });
  }
}
