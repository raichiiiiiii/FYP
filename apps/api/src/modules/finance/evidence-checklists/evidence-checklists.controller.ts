import { Body, Controller, Param, Post } from '@nestjs/common';
import type { CompleteChecklistItemInput } from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('evidence-checklists')
export class EvidenceChecklistsController {
  constructor(private readonly financeService: FinanceService) {}

  @Post(':id/complete-item')
  completeChecklistItem(
    @Param('id') id: string,
    @Body() body: CompleteChecklistItemInput,
  ) {
    return this.financeService.completeChecklistItem(id, body);
  }
}
