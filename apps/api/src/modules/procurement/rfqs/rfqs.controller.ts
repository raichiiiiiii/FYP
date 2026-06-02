import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { CreateRFQInput, RFQTransitionInput } from './rfqs.service';
import { RFQsService } from './rfqs.service';

@Controller('rfqs')
export class RFQsController {
  constructor(private readonly rfqsService: RFQsService) {}

  @Post()
  createRFQ(@Body() body: CreateRFQInput) {
    return this.rfqsService.create(body);
  }

  @Get()
  listRFQs(@Query('organizationId') organizationId?: string) {
    return this.rfqsService.list(organizationId);
  }

  @Post(':id/publish')
  publishRFQ(@Param('id') id: string, @Body() body: RFQTransitionInput) {
    return this.rfqsService.publish(id, body);
  }
}
