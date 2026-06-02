import type { Prisma } from '@prisma/client';

export type EsignPackageInput = {
  organizationId?: string;
  aggregateType: string;
  aggregateId: string;
  signerEmail: string;
  documentId?: string;
  payload?: Prisma.InputJsonObject;
};

export type EsignPackageResult = {
  externalReference: string;
  signingUrl: string;
  status: 'PACKAGE_CREATED_MOCK' | 'PACKAGE_CREATED';
  createdAt: string;
};

export interface EsignAdapter {
  createPackage(input: EsignPackageInput): Promise<EsignPackageResult>;
}
