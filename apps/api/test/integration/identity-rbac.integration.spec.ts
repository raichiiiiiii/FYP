import request from 'supertest';
import { RbacService } from '../../src/modules/identity/rbac.service';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: identity and RBAC', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('creates a user, role, and membership, then changes permission result', async () => {
    const setup = await createOrganizationFixture(context.app);
    const organizationId = setup.organization.id;
    const actorUserId = setup.adminUser.id;
    const roleCode = `PROCUREMENT_APPROVER_INT_${Date.now()}`;

    const user = (
      await request(context.app.getHttpServer())
        .post('/api/v1/users')
        .send({
          email: 'procurement.integration@example.test',
          displayName: 'Procurement Integration',
          organizationId,
          actorUserId,
        })
        .expect(201)
    ).body as { id: string };

    const role = (
      await request(context.app.getHttpServer())
        .post('/api/v1/roles')
        .send({
          code: roleCode,
          name: 'Procurement Approver Integration',
          permissionCodes: ['PROCUREMENT_READ', 'PROCUREMENT_APPROVE'],
          organizationId,
          actorUserId,
        })
        .expect(201)
    ).body as { id: string };

    await request(context.app.getHttpServer())
      .post('/api/v1/memberships')
      .send({
        organizationId,
        userId: user.id,
        roleId: role.id,
        actorUserId,
      })
      .expect(201);

    const memberships = (
      await request(context.app.getHttpServer())
        .get(`/api/v1/orgs/${organizationId}/memberships`)
        .query({ actorUserId })
        .expect(200)
    ).body as Array<{ userId: string; role: { code: string } }>;

    expect(memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: user.id,
          role: expect.objectContaining({
            code: roleCode,
          }),
        }),
      ]),
    );

    const rbac = new RbacService();
    expect(
      rbac.canCreateUsers({
        userId: user.id,
        roleCode: 'PROCUREMENT_OFFICER',
      }),
    ).toBe(false);
    expect(
      rbac.canApproveRequisition(
        {
          userId: user.id,
          roleCode: 'APPROVER',
        },
        {
          requesterUserId: actorUserId,
          segregationRequired: true,
        },
      ),
    ).toBe(true);
  });

  it('prevents organization admins from assigning roles to users registered under another organization', async () => {
    const firstSetup = await createOrganizationFixture(context.app);
    const secondSetup = await createOrganizationFixture(context.app);

    await request(context.app.getHttpServer())
      .post('/api/v1/memberships')
      .send({
        organizationId: firstSetup.organization.id,
        userId: secondSetup.adminUser.id,
        roleId: firstSetup.adminRole.id,
        actorUserId: firstSetup.adminUser.id,
      })
      .expect(403);
  });

  it('lists users, roles, and memberships only for an organization admin scope', async () => {
    const firstSetup = await createOrganizationFixture(context.app);
    const secondSetup = await createOrganizationFixture(context.app);

    const firstUsers = (
      await request(context.app.getHttpServer())
        .get('/api/v1/users')
        .query({
          organizationId: firstSetup.organization.id,
          actorUserId: firstSetup.adminUser.id,
        })
        .expect(200)
    ).body as Array<{ id: string; email: string }>;

    expect(firstUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: firstSetup.adminUser.id }),
      ]),
    );
    expect(firstUsers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: secondSetup.adminUser.id }),
      ]),
    );

    await request(context.app.getHttpServer())
      .get('/api/v1/users')
      .query({
        organizationId: firstSetup.organization.id,
      })
      .expect(400);

    await request(context.app.getHttpServer())
      .get('/api/v1/roles')
      .query({
        organizationId: firstSetup.organization.id,
        actorUserId: firstSetup.adminUser.id,
      })
      .expect(200);

    await request(context.app.getHttpServer())
      .get(`/api/v1/orgs/${firstSetup.organization.id}/memberships`)
      .query({
        actorUserId: secondSetup.adminUser.id,
      })
      .expect(403);
  });

  it('requires an active organization admin actor for role assignment', async () => {
    const setup = await createOrganizationFixture(context.app);

    const user = (
      await request(context.app.getHttpServer())
        .post('/api/v1/users')
        .send({
          email: `member-${Date.now()}@example.test`,
          displayName: 'Regular Member',
          organizationId: setup.organization.id,
          actorUserId: setup.adminUser.id,
        })
        .expect(201)
    ).body as { id: string };

    await request(context.app.getHttpServer())
      .post('/api/v1/memberships')
      .send({
        organizationId: setup.organization.id,
        userId: user.id,
        roleId: setup.adminRole.id,
      })
      .expect(400);
  });
});
