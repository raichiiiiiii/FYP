import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  AttachLossExceptionEvidenceInput,
  ClassifyLossExceptionInput,
  CreateLossExceptionInput,
  ResolveLossExceptionInput,
} from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('loss-exceptions')
export class LossExceptionsController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  createLossException(@Body() body: CreateLossExceptionInput) {
    return this.financeService.createLossException(body);
  }

  @Get()
  listLossExceptions(
    @Query('organizationId') organizationId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.financeService.listLossExceptions(
      organizationId,
      applicationId,
      actorUserId,
    );
  }

  @Get(':id')
  getLossException(
    @Param('id') id: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.financeService.getLossException(id, actorUserId);
  }

  @Post(':id/evidence')
  attachLossExceptionEvidence(
    @Param('id') id: string,
    @Body() body: AttachLossExceptionEvidenceInput,
  ) {
    return this.financeService.attachLossExceptionEvidence(id, body);
  }

  @Post(':id/decision')
  classifyLossException(
    @Param('id') id: string,
    @Body() body: ClassifyLossExceptionInput,
  ) {
    return this.financeService.classifyLossException(id, body);
  }

  @Post(':id/close')
  resolveLossException(
    @Param('id') id: string,
    @Body() body: ResolveLossExceptionInput,
  ) {
    return this.financeService.resolveLossException(id, body);
  }
}
