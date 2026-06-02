import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { CreateOpportunityInput } from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  createOpportunity(@Body() body: CreateOpportunityInput) {
    return this.financeService.createOpportunity(body);
  }

  @Get()
  listOpportunities(@Query('organizationId') organizationId?: string) {
    return this.financeService.listOpportunities(organizationId);
  }

  @Get(':id')
  getOpportunity(@Param('id') id: string) {
    return this.financeService.getOpportunity(id);
  }
}
