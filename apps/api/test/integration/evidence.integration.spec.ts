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

    const uploadedDocument = (
      await request(context.app.getHttpServer())
        .post('/api/v1/documents/upload')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          title: 'Uploaded purchase order evidence',
          documentType: 'PURCHASE_ORDER',
          linkedEntityType: 'PurchaseOrder',
          linkedEntityId: fixture.purchaseOrder.id,
          fileName: 'po-upload.json',
          mimeType: 'application/json',
          contentBase64: Buffer.from(
            JSON.stringify({ poNumber: fixture.purchaseOrder.poNumber }),
          ).toString('base64'),
        })
        .expect(201)
    ).body as {
      id: string;
      versions: Array<{ id: string; storageUri: string; contentHash: string }>;
    };

    const uploadedVersion = uploadedDocument.versions[0];

    const preview = (
      await request(context.app.getHttpServer())
        .get(
          `/api/v1/documents/${uploadedDocument.id}/versions/${uploadedVersion.id}/preview`,
        )
        .expect(200)
    ).body as { previewText: string };

    const download = await request(context.app.getHttpServer())
      .get(
        `/api/v1/documents/${uploadedDocument.id}/versions/${uploadedVersion.id}/download`,
      )
      .expect(200);

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
    expect(uploadedVersion.storageUri).toContain('s3://');
    expect(preview.previewText).toContain(fixture.purchaseOrder.poNumber);
    expect(download.text ?? JSON.stringify(download.body)).toContain(
      fixture.purchaseOrder.poNumber,
    );
    expect(verification).toEqual(
      expect.objectContaining({
        valid: true,
        storedHash: hashRecord.canonicalHash,
      }),
    );

    const pack = (
      await request(context.app.getHttpServer())
        .post('/api/v1/evidence-packs')
        .send({
          organizationId: fixture.organizationId,
          actorUserId: fixture.actorUserId,
          projectId: fixture.project.id,
          title: 'Integration export pack',
        })
        .expect(201)
    ).body as { id: string };

    const jsonExport = await request(context.app.getHttpServer())
      .get(
        `/api/v1/evidence-packs/${pack.id}/export/download?format=json&actorUserId=${fixture.actorUserId}`,
      )
      .expect(200);
    const pdfExport = await request(context.app.getHttpServer())
      .get(
        `/api/v1/evidence-packs/${pack.id}/export/download?format=pdf&actorUserId=${fixture.actorUserId}`,
      )
      .expect(200);

    expect(jsonExport.headers['content-type']).toContain('application/json');
    expect(jsonExport.text).toContain('Integration export pack');
    expect(pdfExport.headers['content-type']).toContain('application/pdf');
  });
});
