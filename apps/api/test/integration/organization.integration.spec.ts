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

  it('allows an organization admin to update profile fields and image references', async () => {
    const created = await request(context.app.getHttpServer())
      .post('/api/v1/orgs')
      .send({
        legalName: 'Example SME Sdn Bhd',
        registrationNumber: 'ORG-PROFILE-001',
        deploymentMode: 'standalone_sme',
        adminUser: {
          email: 'profile-admin@example.test',
          displayName: 'Profile Admin',
        },
      })
      .expect(201);

    const organizationId = created.body.organization.id as string;
    const actorUserId = created.body.adminUser.id as string;

    const updated = await request(context.app.getHttpServer())
      .patch(`/api/v1/orgs/${organizationId}`)
      .send({
        actorUserId,
        legalName: 'Example SME Sdn Bhd',
        registrationNumber: 'ORG-PROFILE-002',
        taxIdentifier: 'C123456789',
        shariahProfile: 'restricted_mudarabah',
        deploymentMode: 'standalone_sme',
        logoImageUrl: '/mock/example-sme-logo.png',
        bannerImageUrl: '/mock/example-sme-banner.jpg',
      })
      .expect(200);

    const auditEvent = await context.prisma.auditEvent.findFirst({
      where: {
        organizationId,
        eventType: 'ORGANIZATION_UPDATED',
      },
    });

    expect(updated.body).toEqual(
      expect.objectContaining({
        legalName: 'Example SME Sdn Bhd',
        registrationNumber: 'ORG-PROFILE-002',
        taxIdentifier: 'C123456789',
        shariahProfile: 'restricted_mudarabah',
        logoImageUrl: '/mock/example-sme-logo.png',
        bannerImageUrl: '/mock/example-sme-banner.jpg',
      }),
    );
    expect(auditEvent).toEqual(
      expect.objectContaining({
        actorUserId,
        entityType: 'Organization',
        entityId: organizationId,
      }),
    );
  });

  it('rejects profile updates from non-admin actors and unsupported image types', async () => {
    const created = await request(context.app.getHttpServer())
      .post('/api/v1/orgs')
      .send({
        legalName: 'Profile Guard Sdn Bhd',
        registrationNumber: 'ORG-PROFILE-GUARD-001',
        deploymentMode: 'standalone_sme',
        adminUser: {
          email: 'profile-guard-admin@example.test',
          displayName: 'Profile Guard Admin',
        },
      })
      .expect(201);

    const organizationId = created.body.organization.id as string;
    const actorUserId = created.body.adminUser.id as string;
    const procurementRole = await context.prisma.role.upsert({
      where: { code: 'PROCUREMENT_OFFICER' },
      update: {
        name: 'Procurement Officer',
      },
      create: {
        code: 'PROCUREMENT_OFFICER',
        name: 'Procurement Officer',
      },
    });
    const procurementUser = await context.prisma.user.create({
      data: {
        email: 'profile-procurement@example.test',
        displayName: 'Profile Procurement',
      },
    });

    await context.prisma.membership.create({
      data: {
        organizationId,
        userId: procurementUser.id,
        roleId: procurementRole.id,
      },
    });

    await request(context.app.getHttpServer())
      .patch(`/api/v1/orgs/${organizationId}`)
      .send({
        actorUserId: procurementUser.id,
        legalName: 'Blocked Profile Update Sdn Bhd',
      })
      .expect(403);

    await request(context.app.getHttpServer())
      .patch(`/api/v1/orgs/${organizationId}`)
      .send({
        actorUserId,
        logoImageUrl: '/mock/example-sme-logo.svg',
      })
      .expect(400);
  });
});
