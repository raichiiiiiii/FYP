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
  const originalEnv = {
    DEV_AUTH_ENABLED: process.env.DEV_AUTH_ENABLED,
    OIDC_ENABLED: process.env.OIDC_ENABLED,
    OIDC_TEST_MODE: process.env.OIDC_TEST_MODE,
    OIDC_ISSUER: process.env.OIDC_ISSUER,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CALLBACK_URL: process.env.OIDC_CALLBACK_URL,
    OIDC_SCOPES: process.env.OIDC_SCOPES,
    OIDC_STATE_SECRET: process.env.OIDC_STATE_SECRET,
  };
  let context: IntegrationAppContext | undefined;

  afterEach(async () => {
    if (context) {
      await closeIntegrationApp(context);
      context = undefined;
    }

    restoreEnv(originalEnv);
  });

  it('allows local dev login when explicitly enabled', async () => {
    process.env.DEV_AUTH_ENABLED = 'true';
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);

    const config = await request(context.app.getHttpServer())
      .get('/api/v1/auth/config')
      .expect(200);

    expect(config.body).toEqual(
      expect.objectContaining({
        devAuthEnabled: true,
        oidcEnabled: false,
      }),
    );

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
        organization: expect.objectContaining({
          id: setup.organization.id,
          legalName: setup.organization.legalName,
          deploymentMode: 'standalone_sme',
        }),
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

  it('creates an OIDC test-provider session for a provisioned user', async () => {
    setOidcTestEnv();
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);
    const start = await request(context.app.getHttpServer())
      .get('/api/v1/auth/oidc/start')
      .query({
        returnTo: '/dashboard',
      })
      .expect(200);

    expect(start.body.authorizationUrl).toContain(
      'https://issuer.example.test/authorize',
    );
    expect(start.body.testMode).toBe(true);

    const idToken = createUnsignedTestIdToken({
      iss: 'https://issuer.example.test',
      aud: 'mepn-test-client',
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: start.body.nonce as string,
      email: setup.adminUser.email,
    });

    const callback = await request(context.app.getHttpServer())
      .post('/api/v1/auth/oidc/callback')
      .send({
        state: start.body.state,
        nonce: start.body.nonce,
        idToken,
        organizationId: setup.organization.id,
      })
      .expect(201);

    expect(callback.body).toEqual(
      expect.objectContaining({
        userId: setup.adminUser.id,
        organizationId: setup.organization.id,
        organization: expect.objectContaining({
          id: setup.organization.id,
          legalName: setup.organization.legalName,
          deploymentMode: 'standalone_sme',
        }),
        authMode: 'oidc',
        oidcEnabled: true,
      }),
    );

    const auditEvent = await context.prisma.auditEvent.findFirstOrThrow({
      where: {
        eventType: 'OIDC_LOGIN_SUCCEEDED',
        entityId: setup.adminUser.id,
      },
    });

    expect(auditEvent.metadata).toEqual(
      expect.objectContaining({
        issuer: 'https://issuer.example.test',
        audience: 'mepn-test-client',
        testMode: true,
      }),
    );
  });

  it.each([
    ['issuer', { iss: 'https://wrong-issuer.example.test' }],
    ['audience', { aud: 'wrong-client' }],
    ['expiry', { exp: Math.floor(Date.now() / 1000) - 60 }],
  ])('rejects invalid OIDC %s claims', async (_caseName, overrides) => {
    setOidcTestEnv();
    context = await createIntegrationApp();
    const setup = await createOrganizationFixture(context.app);
    const start = await request(context.app.getHttpServer())
      .get('/api/v1/auth/oidc/start')
      .expect(200);

    const idToken = createUnsignedTestIdToken({
      iss: 'https://issuer.example.test',
      aud: 'mepn-test-client',
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: start.body.nonce as string,
      email: setup.adminUser.email,
      ...overrides,
    });

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/oidc/callback')
      .send({
        state: start.body.state,
        nonce: start.body.nonce,
        idToken,
        organizationId: setup.organization.id,
      })
      .expect(401);
  });

  it('rejects OIDC login when the identity has no active membership', async () => {
    setOidcTestEnv();
    context = await createIntegrationApp();
    const start = await request(context.app.getHttpServer())
      .get('/api/v1/auth/oidc/start')
      .expect(200);

    const idToken = createUnsignedTestIdToken({
      iss: 'https://issuer.example.test',
      aud: 'mepn-test-client',
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: start.body.nonce as string,
      email: 'missing-oidc-user@example.test',
    });

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/oidc/callback')
      .send({
        state: start.body.state,
        nonce: start.body.nonce,
        idToken,
      })
      .expect(404);
  });
});

function setOidcTestEnv() {
  process.env.OIDC_ENABLED = 'true';
  process.env.OIDC_TEST_MODE = 'true';
  process.env.OIDC_ISSUER = 'https://issuer.example.test';
  process.env.OIDC_CLIENT_ID = 'mepn-test-client';
  process.env.OIDC_CALLBACK_URL = 'https://app.example.test/auth/callback';
  process.env.OIDC_SCOPES = 'openid email profile';
  process.env.OIDC_STATE_SECRET = 'test-state-secret';
}

function createUnsignedTestIdToken(payload: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
      'base64url',
    ),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    '',
  ].join('.');
}

function restoreEnv(originalEnv: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
