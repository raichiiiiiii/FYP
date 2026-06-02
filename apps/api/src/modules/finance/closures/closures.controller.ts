import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateClosureInput } from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('closures')
export class ClosuresController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  createClosure(@Body() body: CreateClosureInput) {
    return this.financeService.createClosure(body);
  }

  @Get()
  listClosures(
    @Query('organizationId') organizationId?: string,
    @Query('applicationId') applicationId?: string,
  ) {
    return this.financeService.listClosures(organizationId, applicationId);
  }
}
