import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../outbox/outbox.service';
import { IntegrationRequestAuditService } from '../integration-request-audit.service';
import type { EsignPackageInput } from './esign-adapter.interface';

@Injectable()
export class EsignPackageService {
  constructor(
    private readonly outbox: OutboxService,
    private readonly integrationAudit: IntegrationRequestAuditService,
  ) {}

  async requestPackage(input: EsignPackageInput) {
    const payload = {
      integrationType: 'ESIGN',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      signerEmail: input.signerEmail,
      documentId: input.documentId,
      payload: input.payload || {},
    };
    const event = await this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'ESIGNATURE_PACKAGE_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: `esign:${input.organizationId || 'global'}:${input.aggregateType}:${input.aggregateId}:${input.signerEmail}`,
      payload,
    });
    await this.integrationAudit.recordRequested({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      outboxEventId: event.id,
      payload,
    });

    return event;
  }
}
