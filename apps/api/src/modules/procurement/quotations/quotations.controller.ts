import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateQuotationInput } from './quotations.service';
import { QuotationsService } from './quotations.service';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  createQuotation(@Body() body: CreateQuotationInput) {
    return this.quotationsService.create(body);
  }

  @Get()
  listQuotations(@Query('organizationId') organizationId?: string) {
    return this.quotationsService.list(organizationId);
  }
}
