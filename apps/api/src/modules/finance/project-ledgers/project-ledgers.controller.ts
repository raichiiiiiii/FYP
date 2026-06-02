import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateLedgerEntryInput } from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('project-ledgers')
export class ProjectLedgersController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('entries')
  createLedgerEntry(@Body() body: CreateLedgerEntryInput) {
    return this.financeService.createLedgerEntry(body);
  }

  @Get('entries')
  listLedgerEntries(
    @Query('organizationId') organizationId?: string,
    @Query('applicationId') applicationId?: string,
  ) {
    return this.financeService.listLedgerEntries(organizationId, applicationId);
  }
}
