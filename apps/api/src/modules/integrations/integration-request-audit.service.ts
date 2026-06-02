import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditEventsService } from '../../audit-events/audit-events.service';

@Injectable()
export class IntegrationRequestAuditService {
  constructor(private readonly auditEvents: AuditEventsService) {}

  recordRequested(input: {
    organizationId?: string;
    actorUserId?: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    outboxEventId: string;
    payload: Prisma.InputJsonObject;
  }) {
    return this.auditEvents.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      entityType: input.aggregateType,
      entityId: input.aggregateId,
      correlationId: input.outboxEventId,
      metadata: {
        outboxEventId: input.outboxEventId,
        integrationEventType: input.eventType,
        status: 'PENDING',
        payload: input.payload,
      },
    });
  }
}
