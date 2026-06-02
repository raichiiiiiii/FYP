import { Body, Controller, Post } from '@nestjs/common';
import type { RequestErpSyncInput } from './erp-sync.service';
import { ErpSyncService } from './erp-sync.service';

@Controller('integrations/erp/sync')
export class ErpSyncController {
  constructor(private readonly erpSync: ErpSyncService) {}

  @Post()
  requestSync(@Body() body: RequestErpSyncInput) {
    return this.erpSync.requestSync(body);
  }
}
