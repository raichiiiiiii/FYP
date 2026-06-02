import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  ActorInput,
  CreateContractInput,
  GenerateContractDocumentInput,
} from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  createContract(@Body() body: CreateContractInput) {
    return this.financeService.createContract(body);
  }

  @Get()
  listContracts(@Query('organizationId') organizationId?: string) {
    return this.financeService.listContracts(organizationId);
  }

  @Post(':id/mark-signed')
  markContractSigned(@Param('id') id: string, @Body() body: ActorInput) {
    return this.financeService.markContractSigned(id, body);
  }

  @Post(':id/generate-document')
  generateContractDocument(
    @Param('id') id: string,
    @Body() body: GenerateContractDocumentInput,
  ) {
    return this.financeService.generateContractDocument(id, body);
  }
}
