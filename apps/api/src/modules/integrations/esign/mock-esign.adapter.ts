import { Injectable } from '@nestjs/common';
import type {
  EsignAdapter,
  EsignPackageInput,
  EsignPackageResult,
} from './esign-adapter.interface';

@Injectable()
export class MockEsignAdapter implements EsignAdapter {
  async createPackage(input: EsignPackageInput): Promise<EsignPackageResult> {
    await Promise.resolve();

    const externalReference = `mock-esign-${input.aggregateType}-${input.aggregateId}`;

    return {
      externalReference,
      signingUrl: `https://esign.example.test/mock/${externalReference}`,
      status: 'PACKAGE_CREATED_MOCK',
      createdAt: new Date().toISOString(),
    };
  }
}
