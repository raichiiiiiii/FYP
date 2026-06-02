import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderTransitionInput,
} from './purchase-orders.service';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  createPurchaseOrder(@Body() body: CreatePurchaseOrderInput) {
    return this.purchaseOrdersService.create(body);
  }

  @Get()
  listPurchaseOrders(@Query('organizationId') organizationId?: string) {
    return this.purchaseOrdersService.list(organizationId);
  }

  @Get(':id')
  getPurchaseOrder(@Param('id') id: string) {
    return this.purchaseOrdersService.getById(id);
  }

  @Post(':id/issue')
  issuePurchaseOrder(
    @Param('id') id: string,
    @Body() body: PurchaseOrderTransitionInput,
  ) {
    return this.purchaseOrdersService.issue(id, body);
  }
}
