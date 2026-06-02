import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateProfitLossStatementInput } from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('profit-loss')
export class ProfitLossController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('statements')
  createProfitLossStatement(@Body() body: CreateProfitLossStatementInput) {
    return this.financeService.createProfitLossStatement(body);
  }

  @Get('statements')
  listProfitLossStatements(
    @Query('organizationId') organizationId?: string,
    @Query('applicationId') applicationId?: string,
  ) {
    return this.financeService.listProfitLossStatements(
      organizationId,
      applicationId,
    );
  }
}
