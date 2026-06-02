import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { RequestWebhookDeliveryInput } from './webhook-delivery.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import type { CreateWebhookSubscriptionInput } from './webhook-subscription.service';
import { WebhookSubscriptionService } from './webhook-subscription.service';

@Controller('integrations/webhooks')
export class WebhooksController {
  constructor(
    private readonly subscriptions: WebhookSubscriptionService,
    private readonly deliveries: WebhookDeliveryService,
  ) {}

  @Post('subscriptions')
  createSubscription(@Body() body: CreateWebhookSubscriptionInput) {
    return this.subscriptions.create(body);
  }

  @Get('subscriptions')
  listSubscriptions(@Query('organizationId') organizationId?: string) {
    return this.subscriptions.list(organizationId);
  }

  @Post('deliveries')
  requestDelivery(@Body() body: RequestWebhookDeliveryInput) {
    return this.deliveries.requestDelivery(body);
  }
}
