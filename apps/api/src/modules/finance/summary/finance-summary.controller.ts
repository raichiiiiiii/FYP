import { Controller, Get, Query } from '@nestjs/common';
import { FinanceService } from '../finance.service';

@Controller('finance')
export class FinanceSummaryController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  getSummary(
    @Query('organizationId') organizationId?: string,
    @Query('roleCodes') roleCodes?: string,
  ) {
    return this.financeService.getSummary(
      organizationId,
      parseRoleCodes(roleCodes),
    );
  }
}

function parseRoleCodes(value?: string) {
  return value
    ? value
        .split(',')
        .map((roleCode) => roleCode.trim())
        .filter(Boolean)
    : [];
}
