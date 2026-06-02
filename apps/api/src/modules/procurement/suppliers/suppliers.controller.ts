import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateSupplierInput } from './suppliers.service';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  createSupplier(@Body() body: CreateSupplierInput) {
    return this.suppliersService.create(body);
  }

  @Get()
  listSuppliers(@Query('organizationId') organizationId?: string) {
    return this.suppliersService.list(organizationId);
  }
}
