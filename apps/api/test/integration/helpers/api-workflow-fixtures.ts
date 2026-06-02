import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

type JsonRecord = Record<string, unknown>;

export async function createOrganizationFixture(app: INestApplication) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/orgs')
    .send({
      legalName: 'Integration SME Sdn Bhd',
      registrationNumber: `INT-${Date.now()}`,
      deploymentMode: 'standalone_sme',
      adminUser: {
        email: `admin-${Date.now()}@example.test`,
        displayName: 'Integration Admin',
      },
    })
    .expect(201);

  return response.body as {
    organization: JsonRecord & { id: string; legalName: string };
    adminUser: JsonRecord & { id: string; email: string };
    adminRole: JsonRecord & { id: string; code: string };
    membership: JsonRecord & { id: string };
    workspace: JsonRecord & { id: string };
  };
}

export async function createProcurementFixture(app: INestApplication) {
  const setup = await createOrganizationFixture(app);
  const organizationId = setup.organization.id;
  const actorUserId = setup.adminUser.id;

  const project = (
    await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        organizationId,
        actorUserId,
        name: 'Integration Procurement Project',
        code: 'INT-PROC',
        budget: 12000,
      })
      .expect(201)
  ).body as JsonRecord & { id: string };

  const supplier = (
    await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .send({
        organizationId,
        actorUserId,
        name: 'Integration Supplier Sdn Bhd',
        email: 'supplier@example.test',
      })
      .expect(201)
  ).body as JsonRecord & { id: string };

  const requisition = (
    await request(app.getHttpServer())
      .post('/api/v1/requisitions')
      .send({
        organizationId,
        actorUserId,
        projectId: project.id,
        requesterUserId: actorUserId,
        title: 'Integration materials',
        justification: 'Integration test source-to-pay path',
        items: [
          {
            description: 'Certified equipment',
            category: 'EQUIPMENT',
            quantity: 2,
            unitPrice: 3000,
          },
        ],
      })
      .expect(201)
  ).body as JsonRecord & { id: string };

  await request(app.getHttpServer())
    .post(`/api/v1/requisitions/${requisition.id}/submit`)
    .send({ actorUserId, approverUserId: actorUserId })
    .expect(201);

  const approvedRequisition = (
    await request(app.getHttpServer())
      .post(`/api/v1/requisitions/${requisition.id}/approve`)
      .send({ actorUserId, approverUserId: actorUserId })
      .expect(201)
  ).body as JsonRecord & { id: string; status: string };

  const rfq = (
    await request(app.getHttpServer())
      .post('/api/v1/rfqs')
      .send({
        organizationId,
        actorUserId,
        requisitionId: requisition.id,
      })
      .expect(201)
  ).body as JsonRecord & { id: string };

  await request(app.getHttpServer())
    .post(`/api/v1/rfqs/${rfq.id}/publish`)
    .send({ actorUserId })
    .expect(201);

  const quotation = (
    await request(app.getHttpServer())
      .post('/api/v1/quotations')
      .send({
        organizationId,
        actorUserId,
        rfqId: rfq.id,
        supplierId: supplier.id,
      })
      .expect(201)
  ).body as JsonRecord & { id: string };

  const purchaseOrder = (
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .send({
        organizationId,
        actorUserId,
        quotationId: quotation.id,
      })
      .expect(201)
  ).body as JsonRecord & { id: string; poNumber: string };

  const issuedPurchaseOrder = (
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${purchaseOrder.id}/issue`)
      .send({ actorUserId })
      .expect(201)
  ).body as JsonRecord & { id: string; status: string };

  const receipt = (
    await request(app.getHttpServer())
      .post('/api/v1/receipts')
      .send({
        organizationId,
        actorUserId,
        purchaseOrderId: purchaseOrder.id,
        notes: 'Received by integration test',
      })
      .expect(201)
  ).body as JsonRecord & { id: string };

  const invoice = (
    await request(app.getHttpServer())
      .post('/api/v1/invoices')
      .send({
        organizationId,
        actorUserId,
        purchaseOrderId: purchaseOrder.id,
        invoiceNumber: `INV-${Date.now()}`,
      })
      .expect(201)
  ).body as JsonRecord & { id: string };

  return {
    ...setup,
    organizationId,
    actorUserId,
    project,
    supplier,
    requisition: approvedRequisition,
    rfq,
    quotation,
    purchaseOrder: issuedPurchaseOrder,
    receipt,
    invoice,
  };
}
