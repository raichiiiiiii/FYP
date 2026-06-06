import request from 'supertest';
import {
  calculateInvitationExpiry,
  createInvitationToken,
  hashInvitationToken,
} from '../../src/modules/auth/invitations/invitation-token';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: auth', () => {
  const originalDevAuthEnabled = process.env.DEV_AUTH_ENABLED;
  let context: IntegrationAppContext | undefined;

  afterEach(async () => {
    if (context) {
      await closeIntegrationApp(context);
      context = undefined;
    }

    if (originalDevAuthEnabled === undefined) {
      delete process.env.DEV_AUTH_ENABLED;
    } else {
      process.env.DEV_AUTH_ENABLED = originalDevAuthEnabled;
    }
  });

  it('allows local dev login when explicitly enabled', async () => {
    process.env.DEV_AUTH_ENABLED = 'true';
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);

    const response = await request(context.app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({
        email: setup.adminUser.email,
        organizationId: setup.organization.id,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        userId: setup.adminUser.id,
        organizationId: setup.organization.id,
        authMode: 'dev',
        devAuthEnabled: true,
      }),
    );
  });

  it('rejects dev login when disabled', async () => {
    process.env.DEV_AUTH_ENABLED = 'false';
    context = await createIntegrationApp();

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({
        email: 'admin@example.test',
        organizationId: 'org-disabled',
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Development login is disabled for this environment',
        );
      });
  });

  it('persists invitations with token hashes only', async () => {
    process.env.DEV_AUTH_ENABLED = 'true';
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);
    const rawToken = createInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);

    const invitation = await context.prisma.invitation.create({
      data: {
        organizationId: setup.organization.id,
        email: 'invitee@example.test',
        roleCode: 'PROCUREMENT_OFFICER',
        tokenHash,
        expiresAt: calculateInvitationExpiry(
          new Date('2026-06-06T00:00:00.000Z'),
          3600,
        ),
        invitedById: setup.adminUser.id,
      },
    });

    expect(invitation.tokenHash).toBe(tokenHash);
    expect(invitation.tokenHash).not.toBe(rawToken);

    const storedInvitation = await context.prisma.invitation.findUniqueOrThrow({
      where: {
        tokenHash,
      },
    });

    expect(storedInvitation.email).toBe('invitee@example.test');
    expect(storedInvitation.status).toBe('pending');
  });

  it('creates and lists invitations without exposing token hashes', async () => {
    process.env.DEV_AUTH_ENABLED = 'true';
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);

    const response = await request(context.app.getHttpServer())
      .post('/api/v1/auth/invitations')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        email: 'new-user@example.test',
        roleCode: setup.adminRole.code,
      })
      .expect(201);

    expect(response.body.token).toBeTruthy();
    expect(response.body.invitation).toEqual(
      expect.objectContaining({
        email: 'new-user@example.test',
        roleCode: 'ORG_ADMIN',
        resolvedStatus: 'pending',
      }),
    );
    expect(response.body.invitation.tokenHash).toBeUndefined();

    const storedInvitation = await context.prisma.invitation.findUniqueOrThrow({
      where: {
        id: response.body.invitation.id as string,
      },
    });

    expect(storedInvitation.tokenHash).toBe(
      hashInvitationToken(response.body.token as string),
    );
    expect(storedInvitation.tokenHash).not.toBe(response.body.token);

    const list = await request(context.app.getHttpServer())
      .get('/api/v1/auth/invitations')
      .query({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      })
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].tokenHash).toBeUndefined();

    const auditEvents = await context.prisma.auditEvent.findMany({
      where: {
        organizationId: setup.organization.id,
        entityType: 'Invitation',
        entityId: response.body.invitation.id as string,
      },
    });

    expect(auditEvents.map((event) => event.eventType)).toContain(
      'INVITATION_CREATED',
    );
  });

  it('rejects invitation management by non-admin members', async () => {
    process.env.DEV_AUTH_ENABLED = 'true';
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);
    const role = await context.prisma.role.create({
      data: {
        code: 'PROCUREMENT_OFFICER',
        name: 'Procurement Officer',
      },
    });
    const user = await context.prisma.user.create({
      data: {
        email: 'procurement-denied@example.test',
        displayName: 'Procurement Denied',
      },
    });

    await context.prisma.membership.create({
      data: {
        organizationId: setup.organization.id,
        userId: user.id,
        roleId: role.id,
      },
    });

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/invitations')
      .send({
        organizationId: setup.organization.id,
        actorUserId: user.id,
        email: 'blocked-invite@example.test',
        roleCode: setup.adminRole.code,
      })
      .expect(403);
  });

  it('accepts an invitation and creates membership with audit events', async () => {
    process.env.DEV_AUTH_ENABLED = 'true';
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);

    const created = await request(context.app.getHttpServer())
      .post('/api/v1/auth/invitations')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        email: 'accepted-invite@example.test',
        roleCode: setup.adminRole.code,
      })
      .expect(201);

    const preview = await request(context.app.getHttpServer())
      .get('/api/v1/auth/invitations/accept')
      .query({
        token: created.body.token as string,
      })
      .expect(200);

    expect(preview.body.resolvedStatus).toBe('pending');

    const accepted = await request(context.app.getHttpServer())
      .post('/api/v1/auth/invitations/accept')
      .send({
        token: created.body.token,
        displayName: 'Accepted Invite',
      })
      .expect(201);

    expect(accepted.body.invitation.resolvedStatus).toBe('accepted');
    expect(accepted.body.user.email).toBe('accepted-invite@example.test');
    expect(accepted.body.membership.role.code).toBe('ORG_ADMIN');

    const auditEvents = await context.prisma.auditEvent.findMany({
      where: {
        organizationId: setup.organization.id,
        eventType: {
          in: ['INVITATION_ACCEPTED', 'MEMBERSHIP_CREATED'],
        },
      },
    });

    expect(auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['INVITATION_ACCEPTED', 'MEMBERSHIP_CREATED']),
    );
  });

  it('rejects revoked and expired invitation acceptance', async () => {
    process.env.DEV_AUTH_ENABLED = 'true';
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);

    const revoked = await request(context.app.getHttpServer())
      .post('/api/v1/auth/invitations')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        email: 'revoked-invite@example.test',
        roleCode: setup.adminRole.code,
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .post(`/api/v1/auth/invitations/${revoked.body.invitation.id}/revoke`)
      .send({
        actorUserId: setup.adminUser.id,
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/invitations/accept')
      .send({
        token: revoked.body.token,
      })
      .expect(409);

    const expiredToken = createInvitationToken();
    await context.prisma.invitation.create({
      data: {
        organizationId: setup.organization.id,
        email: 'expired-invite@example.test',
        roleCode: setup.adminRole.code,
        tokenHash: hashInvitationToken(expiredToken),
        expiresAt: new Date(Date.now() - 60_000),
        invitedById: setup.adminUser.id,
      },
    });

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/invitations/accept')
      .send({
        token: expiredToken,
      })
      .expect(400);
  });
});
