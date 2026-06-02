import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type CreateWebhookSubscriptionInput = {
  organizationId?: string;
  eventType: string;
  targetUrl: string;
  secret?: string;
};

@Injectable()
export class WebhookSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateWebhookSubscriptionInput) {
    return this.prisma.webhookSubscription.create({
      data: {
        organizationId: input.organizationId,
        eventType: input.eventType,
        targetUrl: input.targetUrl,
        secret: input.secret,
      },
    });
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
