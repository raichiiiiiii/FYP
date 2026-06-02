import request from 'supertest';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: organization', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('creates an organization in PostgreSQL and writes ORGANIZATION_CREATED audit event', async () => {
    const response = await request(context.app.getHttpServer())
      .post('/api/v1/orgs')
      .send({
        legalName: 'Org Integration Sdn Bhd',
        registrationNumber: 'ORG-INT-001',
        deploymentMode: 'standalone_sme',
        adminUser: {
          email: 'org-admin@example.test',
          displayName: 'Org Admin',
        },
      })
      .expect(201);

    const organizationId = response.body.organization.id as string;
    const organization = await context.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    const auditEvent = await context.prisma.auditEvent.findFirst({
      where: {
        organizationId,
        eventType: 'ORGANIZATION_CREATED',
      },
    });

    expect(organization).toEqual(
      expect.objectContaining({
        legalName: 'Org Integration Sdn Bhd',
        deploymentMode: 'standalone_sme',
      }),
    );
    expect(auditEvent).toEqual(
      expect.objectContaining({
        entityType: 'Organization',
        entityId: organizationId,
      }),
    );
  });
});
