import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../outbox/outbox.service';
import type { EsignPackageInput } from './esign-adapter.interface';

@Injectable()
export class EsignPackageService {
  constructor(private readonly outbox: OutboxService) {}

  requestPackage(input: EsignPackageInput) {
    return this.outbox.requestIntegration({
      organizationId: input.organizationId,
      eventType: 'ESIGNATURE_PACKAGE_REQUESTED',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: `esign:${input.organizationId || 'global'}:${input.aggregateType}:${input.aggregateId}:${input.signerEmail}`,
      payload: {
        integrationType: 'ESIGN',
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        signerEmail: input.signerEmail,
        documentId: input.documentId,
        payload: input.payload || {},
      },
    });
  }
}
