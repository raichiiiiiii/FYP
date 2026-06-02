import request from 'supertest';
import { createProcurementFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: evidence', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('registers documents, stores immutable versions, verifies hash records, and writes to MinIO', async () => {
    const fixture = await createProcurementFixture(context.app);
    const stored = await context.objectStorage.putObject({
      bucket: 'mepn-evidence-test',
      objectName: `integration/${fixture.purchaseOrder.id}.json`,
      content: JSON.stringify({ poNumber: fixture.purchaseOrder.poNumber }),
      contentType: 'application/json',
    });

    const fetched = await context.objectStorage.getObjectText(
      stored.bucket,
      stored.objectName,
    );
    expect(JSON.parse(fetched)).toEqual({
      poNumber: fixture.purchaseOrder.poNumber,
    });

    const document = (
      await request(context.app.getHttpServer())
        .post('/api/v1/documents')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          title: 'Purchase order evidence',
          documentType: 'PURCHASE_ORDER',
          linkedEntityType: 'PurchaseOrder',
          linkedEntityId: fixture.purchaseOrder.id,
          version: {
            fileName: 'po.json',
            mimeType: 'application/json',
            storageUri: stored.storageUri,
            sizeBytes: stored.sizeBytes,
          },
        })
        .expect(201)
    ).body as { id: string; versions: Array<{ id: string }> };

    const secondVersion = (
      await request(context.app.getHttpServer())
        .post(`/api/v1/documents/${document.id}/versions`)
        .send({
          actorUserId: fixture.actorUserId,
          fileName: 'po-v2.json',
          canonicalContent: {
            poNumber: fixture.purchaseOrder.poNumber,
            totalAmount: 6000,
          },
        })
        .expect(201)
    ).body as { versionNumber: number };

    const hashRecord = (
      await request(context.app.getHttpServer())
        .post('/api/v1/hash-records')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          entityType: 'PurchaseOrder',
          entityId: fixture.purchaseOrder.id,
        })
        .expect(201)
    ).body as { id: string; canonicalHash: string };

    const verification = (
      await request(context.app.getHttpServer())
        .get(`/api/v1/hash-records/${hashRecord.id}/verify`)
        .expect(200)
    ).body as { valid: boolean; storedHash: string };

    expect(secondVersion.versionNumber).toBe(2);
    expect(verification).toEqual(
      expect.objectContaining({
        valid: true,
        storedHash: hashRecord.canonicalHash,
      }),
    );
  });
});
