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
});
