import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { InvoicesController } from './invoices/invoices.controller';
import { InvoicesService } from './invoices/invoices.service';
import { ProcurementOperationsController } from './operations/procurement-operations.controller';
import { ProcurementOperationsService } from './operations/procurement-operations.service';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { QuotationsController } from './quotations/quotations.controller';
import { QuotationsService } from './quotations/quotations.service';
import { ReceiptsController } from './receipts/receipts.controller';
import { ReceiptsService } from './receipts/receipts.service';
import { RequisitionsController } from './requisitions/requisitions.controller';
import { RequisitionsService } from './requisitions/requisitions.service';
import { RFQsController } from './rfqs/rfqs.controller';
import { RFQsService } from './rfqs/rfqs.service';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [
    ProjectsController,
    SuppliersController,
    RequisitionsController,
    RFQsController,
    QuotationsController,
    PurchaseOrdersController,
    ReceiptsController,
    InvoicesController,
    ProcurementOperationsController,
  ],
  providers: [
    ProjectsService,
    SuppliersService,
    RequisitionsService,
    RFQsService,
    QuotationsService,
    PurchaseOrdersService,
    ReceiptsService,
    InvoicesService,
    ProcurementOperationsService,
  ],
})
export class ProcurementModule {}
