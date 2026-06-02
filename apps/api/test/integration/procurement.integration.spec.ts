import { createProcurementFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: procurement', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('persists a source-to-pay path and writes audit events for state changes', async () => {
    const fixture = await createProcurementFixture(context.app);
    const requisition = await context.prisma.requisition.findUnique({
      where: { id: fixture.requisition.id },
    });
    const purchaseOrder = await context.prisma.purchaseOrder.findUnique({
      where: { id: fixture.purchaseOrder.id },
    });
    const auditEvents = await context.prisma.auditEvent.findMany({
      where: {
        organizationId: fixture.organizationId,
        eventType: {
          in: [
            'PROJECT_CREATED',
            'SUPPLIER_CREATED',
            'REQUISITION_CREATED',
            'REQUISITION_SUBMITTED',
            'REQUISITION_APPROVED',
            'RFQ_CREATED',
            'RFQ_PUBLISHED',
            'QUOTATION_RECEIVED',
            'PURCHASE_ORDER_CREATED',
            'PURCHASE_ORDER_ISSUED',
            'RECEIPT_RECORDED',
            'INVOICE_RECORDED',
          ],
        },
      },
    });

    expect(requisition).toEqual(
      expect.objectContaining({
        status: 'CLOSED',
      }),
    );
    expect(purchaseOrder).toEqual(
      expect.objectContaining({
        status: 'INVOICED',
      }),
    );
    expect(auditEvents).toHaveLength(12);
  });
});
