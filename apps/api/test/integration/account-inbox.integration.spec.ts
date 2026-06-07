import request from 'supertest';
import { createHash } from 'node:crypto';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: account profile and inbox', () => {
  const originalPasswordAuthEnabled = process.env.LOCAL_PASSWORD_AUTH_ENABLED;
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
    if (originalPasswordAuthEnabled === undefined) {
      delete process.env.LOCAL_PASSWORD_AUTH_ENABLED;
    } else {
      process.env.LOCAL_PASSWORD_AUTH_ENABLED = originalPasswordAuthEnabled;
    }
  });

  it('returns account access and updates profile display fields', async () => {
    const setup = await createOrganizationFixture(context.app);

    const profile = await request(context.app.getHttpServer())
      .get('/api/v1/account/profile')
      .query({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      })
      .expect(200);

    expect(profile.body).toEqual(
      expect.objectContaining({
        id: setup.adminUser.id,
        email: setup.adminUser.email,
        roleCodes: expect.arrayContaining(['ORG_ADMIN']),
      }),
    );

    const updated = await request(context.app.getHttpServer())
      .patch('/api/v1/account/profile')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        displayName: 'Updated Admin',
        profileImageUrl: '/mock/example-sme-logo.png',
      })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        displayName: 'Updated Admin',
        profileImageUrl: '/mock/example-sme-logo.png',
      }),
    );

    const auditEvent = await context.prisma.auditEvent.findFirst({
      where: {
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        eventType: 'ACCOUNT_PROFILE_UPDATED',
      },
    });

    expect(auditEvent).toEqual(
      expect.objectContaining({
        entityType: 'User',
        entityId: setup.adminUser.id,
      }),
    );
  });

  it('creates permission requests for admins and tracks unread inbox state', async () => {
    const setup = await createOrganizationFixture(context.app);
    const procurementRole = await context.prisma.role.upsert({
      where: { code: 'PROCUREMENT_OFFICER' },
      update: { name: 'Procurement Officer' },
      create: {
        code: 'PROCUREMENT_OFFICER',
        name: 'Procurement Officer',
      },
    });
    const procurementUser = await context.prisma.user.create({
      data: {
        email: `permission-requester-${Date.now()}@example.test`,
        displayName: 'Permission Requester',
      },
    });

    await context.prisma.membership.create({
      data: {
        organizationId: setup.organization.id,
        userId: procurementUser.id,
        roleId: procurementRole.id,
      },
    });

    const requestResponse = await request(context.app.getHttpServer())
      .post('/api/v1/inbox/permission-requests')
      .send({
        organizationId: setup.organization.id,
        actorUserId: procurementUser.id,
        requestedRoleCode: 'AUDITOR',
        reason: 'Need audit review access for evidence package preparation.',
      })
      .expect(201);

    expect(requestResponse.body).toEqual(
      expect.objectContaining({
        itemType: 'permission_request',
        recipientRoleCode: 'ORG_ADMIN',
        status: 'unread',
      }),
    );

    const adminInbox = await request(context.app.getHttpServer())
      .get('/api/v1/inbox')
      .query({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      })
      .expect(200);

    expect(adminInbox.body.unreadCount).toBe(1);
    expect(adminInbox.body.items[0]).toEqual(
      expect.objectContaining({
        id: requestResponse.body.id,
        senderUserId: procurementUser.id,
        recipientRoleCode: 'ORG_ADMIN',
      }),
    );

    await request(context.app.getHttpServer())
      .post(`/api/v1/inbox/${requestResponse.body.id}/read`)
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      })
      .expect(201);

    const readInbox = await request(context.app.getHttpServer())
      .get('/api/v1/inbox')
      .query({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      })
      .expect(200);

    expect(readInbox.body.unreadCount).toBe(0);
  });

  it('updates local password after verifying current password and audits without password values', async () => {
    const setup = await createOrganizationFixture(context.app);

    await context.prisma.user.update({
      where: {
        id: setup.adminUser.id,
      },
      data: {
        passwordHash: hashPassword('password'),
      },
    });

    process.env.LOCAL_PASSWORD_AUTH_ENABLED = 'false';
    await request(context.app.getHttpServer())
      .patch('/api/v1/account/password')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        currentPassword: 'password',
        newPassword: 'new-password-1',
      })
      .expect(403);

    process.env.LOCAL_PASSWORD_AUTH_ENABLED = 'true';
    await request(context.app.getHttpServer())
      .patch('/api/v1/account/password')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        currentPassword: 'wrong-password',
        newPassword: 'new-password-1',
      })
      .expect(401);

    const response = await request(context.app.getHttpServer())
      .patch('/api/v1/account/password')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        currentPassword: 'password',
        newPassword: 'new-password-1',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        updated: true,
        userId: setup.adminUser.id,
        organizationId: setup.organization.id,
      }),
    );

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-login')
      .send({
        email: setup.adminUser.email,
        password: 'password',
        organizationId: setup.organization.id,
      })
      .expect(401);

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-login')
      .send({
        email: setup.adminUser.email,
        password: 'new-password-1',
        organizationId: setup.organization.id,
      })
      .expect(201);

    const auditEvent = await context.prisma.auditEvent.findFirst({
      where: {
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        eventType: 'ACCOUNT_PASSWORD_UPDATED',
      },
    });

    expect(auditEvent).toEqual(
      expect.objectContaining({
        entityType: 'User',
        entityId: setup.adminUser.id,
      }),
    );
    expect(JSON.stringify(auditEvent?.metadata)).not.toMatch(
      /password|new-password-1/i,
    );
  });

  it('prevents non-recipient members from marking inbox items as read', async () => {
    const setup = await createOrganizationFixture(context.app);
    const requester = await context.prisma.user.create({
      data: {
        email: `read-denied-${Date.now()}@example.test`,
        displayName: 'Read Denied',
      },
    });
    const auditorRole = await context.prisma.role.upsert({
      where: { code: 'AUDITOR' },
      update: { name: 'Auditor' },
      create: {
        code: 'AUDITOR',
        name: 'Auditor',
      },
    });

    await context.prisma.membership.create({
      data: {
        organizationId: setup.organization.id,
        userId: requester.id,
        roleId: auditorRole.id,
      },
    });

    const item = await request(context.app.getHttpServer())
      .post('/api/v1/inbox/messages')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        recipientRoleCode: 'ORG_ADMIN',
        subject: 'Admin only',
        body: 'This is scoped to organization admins.',
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .post(`/api/v1/inbox/${item.body.id}/read`)
      .send({
        organizationId: setup.organization.id,
        actorUserId: requester.id,
      })
      .expect(403);
  });
});

function hashPassword(password: string) {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}
