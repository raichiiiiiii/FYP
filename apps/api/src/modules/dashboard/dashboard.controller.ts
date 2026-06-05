import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @Query('organizationId') organizationId?: string,
    @Query('roleCodes') roleCodes?: string,
  ) {
    return this.dashboardService.getSummary({
      organizationId,
      roleCodes: parseRoleCodes(roleCodes),
    });
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
