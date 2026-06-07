import request from 'supertest';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

describe('Integration: local node federation', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('creates simulated peers, channels, invitations, and a canvas without Fabric topology mutation', async () => {
    const setup = await createOrganizationFixture(context.app);
    const scope = {
      organizationId: setup.organization.id,
      actorUserId: setup.adminUser.id,
      localNodeKey: 'amanah-retail',
    };

    const peer = await request(context.app.getHttpServer())
      .post('/api/v1/node-federation/peers')
      .send({
        ...scope,
        peerNodeKey: 'barakah-supplies',
        peerOrganizationName: 'Barakah Supplies Sdn Bhd',
        peerNodeType: 'BUSINESS_SUPPLIER_MUDARIB',
        peerApiUrl: 'http://localhost:3001',
        peerWebUrl: 'http://localhost:5174',
      })
      .expect(201);

    expect(peer.body).toEqual(
      expect.objectContaining({
        peerNodeKey: 'barakah-supplies',
        status: 'configured',
      }),
    );

    const channel = await request(context.app.getHttpServer())
      .post('/api/v1/node-federation/channels')
      .send({
        ...scope,
        channelName: 'mepn-business-tender-channel',
        channelType: 'SHARED_TENDER_COMPETITION',
        purpose: 'Local simulated tender visibility for UAT-B-003',
      })
      .expect(201);

    expect(channel.body).toEqual(
      expect.objectContaining({
        channelName: 'mepn-business-tender-channel',
        channelType: 'SHARED_TENDER_COMPETITION',
        status: 'simulated_proposed',
      }),
    );
    expect(channel.body.memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeKey: 'amanah-retail',
          membershipStatus: 'simulated_joined',
        }),
      ]),
    );

    const invite = await request(context.app.getHttpServer())
      .post(`/api/v1/node-federation/channels/${channel.body.id}/invite`)
      .send({
        ...scope,
        peerId: peer.body.id,
      })
      .expect(201);

    expect(invite.body.channel.memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeKey: 'barakah-supplies',
          membershipStatus: 'simulated_invited',
        }),
      ]),
    );
    expect(invite.body.outboundEvent).toEqual(
      expect.objectContaining({
        eventType: 'node_channel_invitation',
        status: 'queued',
      }),
    );

    const canvas = await request(context.app.getHttpServer())
      .get('/api/v1/node-federation/canvas')
      .query(scope)
      .expect(200);

    expect(canvas.body.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'node:amanah-retail' }),
        expect.objectContaining({ id: 'node:barakah-supplies' }),
        expect.objectContaining({
          id: 'channel:mepn-business-tender-channel',
        }),
      ]),
    );
    expect(canvas.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'peers_with' }),
        expect.objectContaining({ type: 'participates_in_channel' }),
      ]),
    );
    expect(JSON.stringify(canvas.body)).not.toMatch(
      /BEGIN|PRIVATE KEY|password|token|FABRIC_PRIVATE_KEY/i,
    );
  });

  it('requires admin-like role for simulated federation mutations', async () => {
    const setup = await createOrganizationFixture(context.app);
    const officer = await createRoleUser({
      roleCode: 'PROCUREMENT_OFFICER',
      organizationId: setup.organization.id,
    });

    await request(context.app.getHttpServer())
      .post('/api/v1/node-federation/peers')
      .send({
        organizationId: setup.organization.id,
        actorUserId: officer.id,
        localNodeKey: 'amanah-retail',
        peerNodeKey: 'barakah-supplies',
        peerOrganizationName: 'Barakah Supplies Sdn Bhd',
      })
      .expect(403);
  });

  it('mirrors inbound invitation events using a local shared-secret boundary', async () => {
    await context.prisma.nodeDeployment.create({
      data: {
        nodeKey: 'barakah-supplies',
        displayName: 'Barakah Supplies Sdn Bhd',
        nodeType: 'BUSINESS_SUPPLIER_MUDARIB',
        publicApiUrl: 'http://localhost:3001',
        publicWebUrl: 'http://localhost:5174',
        status: 'local',
      },
    });

    await request(context.app.getHttpServer())
      .post('/api/v1/node-federation/events')
      .send({
        localNodeKey: 'barakah-supplies',
        eventType: 'node_channel_invitation',
        idempotencyKey: 'uat-node-invitation-001',
        sourceNode: {
          nodeKey: 'amanah-retail',
          organizationName: 'Amanah Retail Sdn Bhd',
          nodeType: 'BUSINESS_BUYER_SUPPLIER',
          apiUrl: 'http://localhost:3000',
          webUrl: 'http://localhost:5173',
        },
        channel: {
          channelName: 'mepn-business-tender-channel',
          channelType: 'SHARED_TENDER_COMPETITION',
          purpose: 'Local simulated tender visibility for UAT-B-003',
          status: 'simulated_invited',
        },
        memberships: [
          {
            nodeKey: 'amanah-retail',
            organizationName: 'Amanah Retail Sdn Bhd',
            nodeType: 'BUSINESS_BUYER_SUPPLIER',
            membershipStatus: 'simulated_joined',
          },
          {
            nodeKey: 'barakah-supplies',
            organizationName: 'Barakah Supplies Sdn Bhd',
            nodeType: 'BUSINESS_SUPPLIER_MUDARIB',
            membershipStatus: 'simulated_invited',
          },
        ],
      })
      .set('x-mepn-node-secret', 'local-demo-federation-only')
      .expect(201);

    const mirroredChannel = await context.prisma.nodeChannel.findFirstOrThrow({
      where: {
        localNode: { nodeKey: 'barakah-supplies' },
        channelName: 'mepn-business-tender-channel',
      },
      include: { memberships: true },
    });

    expect(mirroredChannel.status).toBe('simulated_invited');
    expect(mirroredChannel.memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeKey: 'amanah-retail',
          membershipStatus: 'simulated_joined',
        }),
        expect.objectContaining({
          nodeKey: 'barakah-supplies',
          membershipStatus: 'simulated_invited',
        }),
      ]),
    );

    const replay = await request(context.app.getHttpServer())
      .post('/api/v1/node-federation/events')
      .send({
        localNodeKey: 'barakah-supplies',
        eventType: 'node_channel_invitation',
        idempotencyKey: 'uat-node-invitation-001',
        sourceNode: {
          nodeKey: 'amanah-retail',
          organizationName: 'Amanah Retail Sdn Bhd',
        },
      })
      .set('x-mepn-node-secret', 'local-demo-federation-only')
      .expect(201);

    expect(replay.body).toEqual(
      expect.objectContaining({
        status: 'processed',
        idempotentReplay: true,
      }),
    );
  });

  it('rejects inbound node events without the local shared secret or with secret-like payloads', async () => {
    await context.prisma.nodeDeployment.create({
      data: {
        nodeKey: 'safwa-growth',
        displayName: 'Safwa SME Growth Fund',
        nodeType: 'FINANCE_ENTITY',
        status: 'local',
      },
    });

    const payload = {
      localNodeKey: 'safwa-growth',
      eventType: 'node_channel_invitation',
      idempotencyKey: 'uat-node-invitation-secret-test',
      sourceNode: {
        nodeKey: 'mabrur-finance',
        organizationName: 'Mabrur Finance Partner',
      },
      channel: {
        channelName: 'mepn-finance-support-channel',
        channelType: 'FINANCE_BACKUP_SUPPORT',
      },
    };

    await request(context.app.getHttpServer())
      .post('/api/v1/node-federation/events')
      .send(payload)
      .expect(403);

    await request(context.app.getHttpServer())
      .post('/api/v1/node-federation/events')
      .send({
        ...payload,
        idempotencyKey: 'uat-node-invitation-unsafe-payload',
        payload: {
          material: 'private key material placeholder',
        },
      })
      .set('x-mepn-node-secret', 'local-demo-federation-only')
      .expect(400);
  });

  async function createRoleUser(input: {
    organizationId: string;
    roleCode: string;
  }) {
    const role = await context.prisma.role.upsert({
      where: { code: input.roleCode },
      update: {
        name: input.roleCode,
        description: input.roleCode,
      },
      create: {
        code: input.roleCode,
        name: input.roleCode,
        description: input.roleCode,
      },
    });
    const user = await context.prisma.user.create({
      data: {
        email: `node-federation-${Date.now()}@example.test`,
        displayName: 'Node Federation Test User',
        status: 'active',
      },
    });

    await context.prisma.membership.create({
      data: {
        organizationId: input.organizationId,
        userId: user.id,
        roleId: role.id,
        status: 'active',
      },
    });

    return user;
  }
});
