import { Body, Controller, Post } from '@nestjs/common';
import type { CreateDisbursementInput } from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('disbursements')
export class DisbursementsController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  createDisbursement(@Body() body: CreateDisbursementInput) {
    return this.financeService.createDisbursement(body);
  }
}
