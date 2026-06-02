import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  CreateRequisitionInput,
  RequisitionTransitionInput,
} from './requisitions.service';
import { RequisitionsService } from './requisitions.service';

@Controller('requisitions')
export class RequisitionsController {
  constructor(private readonly requisitionsService: RequisitionsService) {}

  @Post()
  createRequisition(@Body() body: CreateRequisitionInput) {
    return this.requisitionsService.create(body);
  }

  @Get()
  listRequisitions(@Query('organizationId') organizationId?: string) {
    return this.requisitionsService.list(organizationId);
  }

  @Get(':id')
  getRequisition(@Param('id') id: string) {
    return this.requisitionsService.getById(id);
  }

  @Post(':id/submit')
  submitRequisition(
    @Param('id') id: string,
    @Body() body: RequisitionTransitionInput,
  ) {
    return this.requisitionsService.submit(id, body);
  }

  @Post(':id/approve')
  approveRequisition(
    @Param('id') id: string,
    @Body() body: RequisitionTransitionInput,
  ) {
    return this.requisitionsService.approve(id, body);
  }

  @Post(':id/reject')
  rejectRequisition(
    @Param('id') id: string,
    @Body() body: RequisitionTransitionInput,
  ) {
    return this.requisitionsService.reject(id, body);
  }
}
