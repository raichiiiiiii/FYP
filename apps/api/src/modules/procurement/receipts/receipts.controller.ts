import { Body, Controller, Post } from '@nestjs/common';
import type { CreateReceiptInput } from './receipts.service';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  createReceipt(@Body() body: CreateReceiptInput) {
    return this.receiptsService.create(body);
  }
}
