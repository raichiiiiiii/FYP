import { Body, Controller, Post } from '@nestjs/common';
import type { FinanceApiNotificationInput } from './finance-api-adapter.interface';
import { FinanceApiNotificationService } from './finance-api-notification.service';

@Controller('integrations/finance-api/notifications')
export class FinanceApiNotificationController {
  constructor(private readonly notifications: FinanceApiNotificationService) {}

  @Post()
  requestNotification(@Body() body: FinanceApiNotificationInput) {
    return this.notifications.requestNotification(body);
  }
}
