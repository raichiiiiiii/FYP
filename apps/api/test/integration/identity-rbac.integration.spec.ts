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
          code: 'PROCUREMENT_APPROVER_INT',
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
        .expect(200)
    ).body as Array<{ userId: string; role: { code: string } }>;

    expect(memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: user.id,
          role: expect.objectContaining({
            code: 'PROCUREMENT_APPROVER_INT',
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
});
