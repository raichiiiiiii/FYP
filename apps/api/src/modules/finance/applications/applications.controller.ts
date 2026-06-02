import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  ActorInput,
  CreateApplicationInput,
  CreateDueDiligenceInput,
  CreateEvidenceChecklistInput,
  CreateShariahReviewInput,
  RejectApplicationInput,
} from '../finance.service';
import { FinanceService } from '../finance.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  createApplication(@Body() body: CreateApplicationInput) {
    return this.financeService.createApplication(body);
  }

  @Get()
  listApplications(@Query('organizationId') organizationId?: string) {
    return this.financeService.listApplications(organizationId);
  }

  @Get(':id')
  getApplication(@Param('id') id: string) {
    return this.financeService.getApplication(id);
  }

  @Post(':id/submit')
  submitApplication(@Param('id') id: string, @Body() body: ActorInput) {
    return this.financeService.submitApplication(id, body);
  }

  @Post(':id/evidence-checklist')
  createEvidenceChecklist(
    @Param('id') id: string,
    @Body() body: CreateEvidenceChecklistInput,
  ) {
    return this.financeService.createEvidenceChecklist(id, body);
  }

  @Post(':id/due-diligence')
  createDueDiligence(
    @Param('id') id: string,
    @Body() body: CreateDueDiligenceInput,
  ) {
    return this.financeService.createDueDiligence(id, body);
  }

  @Post(':id/shariah-review')
  createShariahReview(
    @Param('id') id: string,
    @Body() body: CreateShariahReviewInput,
  ) {
    return this.financeService.createShariahReview(id, body);
  }

  @Post(':id/approve')
  approveApplication(@Param('id') id: string, @Body() body: ActorInput) {
    return this.financeService.approveApplication(id, body);
  }

  @Post(':id/reject')
  rejectApplication(
    @Param('id') id: string,
    @Body() body: RejectApplicationInput,
  ) {
    return this.financeService.rejectApplication(id, body);
  }
}
