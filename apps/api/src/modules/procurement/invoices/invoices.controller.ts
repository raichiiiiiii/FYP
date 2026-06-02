import { Body, Controller, Post } from '@nestjs/common';
import type { CreateInvoiceInput } from './invoices.service';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  createInvoice(@Body() body: CreateInvoiceInput) {
    return this.invoicesService.create(body);
  }
}
