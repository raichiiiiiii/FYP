import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditEventsService } from '../../../audit-events/audit-events.service';

export type CreateWebhookSubscriptionInput = {
  organizationId?: string;
  actorUserId?: string;
  eventType: string;
  targetUrl: string;
  secret?: string;
};

@Injectable()
export class WebhookSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateWebhookSubscriptionInput) {
    const subscription = await this.prisma.webhookSubscription.create({
      data: {
        organizationId: input.organizationId,
        eventType: input.eventType,
        targetUrl: input.targetUrl,
        secret: input.secret,
      },
    });

    await this.auditEvents.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'WEBHOOK_SUBSCRIPTION_CREATED',
      entityType: 'WebhookSubscription',
      entityId: subscription.id,
      metadata: {
        eventType: input.eventType,
        targetUrl: input.targetUrl,
        status: subscription.status,
      },
    });

    return subscription;
  }

  list(organizationId?: string) {
    return this.prisma.webhookSubscription.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
