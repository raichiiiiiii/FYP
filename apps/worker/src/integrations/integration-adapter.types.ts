import type { Prisma } from '@prisma/client';

export type AdapterResult = {
  integrationType: string;
  externalReference: string;
  status: string;
  responsePayload: Prisma.InputJsonObject;
};
