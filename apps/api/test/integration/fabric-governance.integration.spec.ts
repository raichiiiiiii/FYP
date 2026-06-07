import request from 'supertest';
import { createOrganizationFixture } from './helpers/api-workflow-fixtures';
import {
  closeIntegrationApp,
  createIntegrationApp,
  type IntegrationAppContext,
} from './helpers/integration-test-context';

let userCounter = 0;

describe('Integration: Fabric consortium governance', () => {
  let context: IntegrationAppContext;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  afterAll(async () => {
    await closeIntegrationApp(context);
  });

  it('creates channel governance metadata and proposal without mutating Fabric topology', async () => {
    const setup = await createOrganizationFixture(context.app);

    const created = await request(context.app.getHttpServer())
      .post('/api/v1/fabric/channels')
      .send({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
        networkName: 'Integration Fabric Network',
        channelName: 'audit-review-channel',
        chaincodeName: 'audit-anchor',
        mspId: 'Org1MSP',
      })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        channelName: 'audit-review-channel',
        chaincodeName: 'audit-anchor',
        status: 'proposed',
        readinessStatus: 'operator_pending',
      }),
    );
    expect(created.body.proposals).toEqual([
      expect.objectContaining({
        proposalType: 'create_channel',
        status: 'pending_approval',
        requiredApprovals: 2,
        receivedApprovals: 0,
      }),
    ]);

    const readiness = await request(context.app.getHttpServer())
      .get(`/api/v1/fabric/channels/${created.body.id}/readiness`)
      .query({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      })
      .expect(200);

    expect(readiness.body.ready).toBe(false);
    expect(readiness.body.limitations).toContain(
      'Channel topology is operator-executed outside the app.',
    );

    await expectNoFabricTopologySideEffects(context);

    const events = await context.prisma.auditEvent.findMany({
      where: {
        organizationId: setup.organization.id,
        entityType: 'FabricChannel',
        entityId: created.body.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        'FABRIC_CHANNEL_PROPOSED',
        'FABRIC_CHANNEL_READINESS_CHECKED',
      ]),
    );
  });

  it('reports direct topology automation readiness without exposing secret material', async () => {
    const setup = await createOrganizationFixture(context.app);

    const readiness = await request(context.app.getHttpServer())
      .get('/api/v1/fabric/automation/readiness')
      .query({
        organizationId: setup.organization.id,
        actorUserId: setup.adminUser.id,
      })
      .expect(200);

    expect(readiness.body).toEqual(
      expect.objectContaining({
        enabled: false,
        status: 'disabled',
        executionMode: 'not_enabled',
      }),
    );
    expect(readiness.body.missingRequirementIds).toContain(
      'automation-adr-approved',
    );
    expect(JSON.stringify(readiness.body)).not.toMatch(
      /BEGIN|PRIVATE KEY|FABRIC_PRIVATE_KEY|password|token/i,
    );
  });

  it('invites an organization, accepts membership, approves, and records sanitized operator execution', async () => {
    const sponsor = await createOrganizationFixture(context.app);
    const invited = await createOrganizationFixture(context.app);
    const operator = await createUserWithRole(context, {
      organizationId: sponsor.organization.id,
      roleCode: 'PLATFORM_OPERATOR',
      emailPrefix: 'fabric-operator',
    });

    const channel = await request(context.app.getHttpServer())
      .post('/api/v1/fabric/channels')
      .send({
        organizationId: sponsor.organization.id,
        actorUserId: sponsor.adminUser.id,
        channelName: 'supplier-audit-channel',
        chaincodeName: 'audit-anchor',
        mspId: 'SponsorMSP',
      })
      .expect(201);

    const proposalId = channel.body.proposals[0].id as string;

    const invitation = await request(context.app.getHttpServer())
      .post(`/api/v1/fabric/channels/${channel.body.id}/invitations`)
      .send({
        organizationId: sponsor.organization.id,
        actorUserId: sponsor.adminUser.id,
        invitedOrganizationId: invited.organization.id,
        invitedMspId: 'InvitedMSP',
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .post(`/api/v1/fabric/channel-invitations/${invitation.body.id}/accept`)
      .send({
        organizationId: invited.organization.id,
        actorUserId: invited.adminUser.id,
        mspId: 'InvitedMSP',
        certificateFingerprint: 'sha256:abc123',
        certificateIssuer: 'Operator-issued demo CA',
      })
      .expect(201);

    const sponsorApproval = await request(context.app.getHttpServer())
      .post(`/api/v1/fabric/channel-proposals/${proposalId}/approve`)
      .send({
        organizationId: sponsor.organization.id,
        actorUserId: sponsor.adminUser.id,
        rationale:
          'Sponsor organization approves operator-assisted channel creation.',
      })
      .expect(201);

    expect(sponsorApproval.body.status).toBe('pending_approval');

    const operatorApproval = await request(context.app.getHttpServer())
      .post(`/api/v1/fabric/channel-proposals/${proposalId}/approve`)
      .send({
        organizationId: sponsor.organization.id,
        actorUserId: operator.userId,
        rationale: 'Platform operator accepts execution handoff.',
      })
      .expect(201);

    expect(operatorApproval.body.status).toBe('operator_pending');
    expect(operatorApproval.body.receivedApprovals).toBe(2);

    const executed = await request(context.app.getHttpServer())
      .post(`/api/v1/fabric/channel-proposals/${proposalId}/operator-execution`)
      .send({
        organizationId: sponsor.organization.id,
        actorUserId: operator.userId,
        evidenceType: 'operator_command_summary',
        contentHash:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        metadata: {
          command: 'peer channel create/join completed outside MEPN',
          sanitized: true,
        },
      })
      .expect(201);

    expect(executed.body.status).toBe('executed');
    expect(executed.body.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceType: 'operator_command_summary',
          contentHash:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        }),
      ]),
    );

    const memberships = await request(context.app.getHttpServer())
      .get(`/api/v1/fabric/channels/${channel.body.id}/memberships`)
      .query({
        organizationId: sponsor.organization.id,
        actorUserId: sponsor.adminUser.id,
      })
      .expect(200);

    expect(memberships.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organizationId: sponsor.organization.id,
          membershipStatus: 'joined',
        }),
        expect.objectContaining({
          organizationId: invited.organization.id,
          membershipStatus: 'joined',
        }),
      ]),
    );
  });

  it('rejects secret-like operator evidence', async () => {
    const sponsor = await createOrganizationFixture(context.app);
    const operator = await createUserWithRole(context, {
      organizationId: sponsor.organization.id,
      roleCode: 'PLATFORM_OPERATOR',
      emailPrefix: 'fabric-secret-operator',
    });
    const channel = await request(context.app.getHttpServer())
      .post('/api/v1/fabric/channels')
      .send({
        organizationId: sponsor.organization.id,
        actorUserId: sponsor.adminUser.id,
        channelName: 'secret-rejected-channel',
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .post(
        `/api/v1/fabric/channel-proposals/${channel.body.proposals[0].id}/operator-execution`,
      )
      .send({
        organizationId: sponsor.organization.id,
        actorUserId: operator.userId,
        metadata: {
          unsafe: '-----BEGIN PRIVATE KEY-----',
        },
      })
      .expect(400);
  });

  it('denies governance mutation to non-governance roles', async () => {
    const setup = await createOrganizationFixture(context.app);
    const procurement = await createUserWithRole(context, {
      organizationId: setup.organization.id,
      roleCode: 'PROCUREMENT_OFFICER',
      emailPrefix: 'fabric-procurement',
    });

    await request(context.app.getHttpServer())
      .post('/api/v1/fabric/channels')
      .send({
        organizationId: setup.organization.id,
        actorUserId: procurement.userId,
        channelName: 'unauthorized-channel',
      })
      .expect(403);

    await request(context.app.getHttpServer())
      .get('/api/v1/fabric/automation/readiness')
      .query({
        organizationId: setup.organization.id,
        actorUserId: procurement.userId,
      })
      .expect(403);
  });
});

async function createUserWithRole(
  context: IntegrationAppContext,
  input: {
    organizationId: string;
    roleCode: string;
    emailPrefix: string;
  },
) {
  const role = await context.prisma.role.upsert({
    where: {
      code: input.roleCode,
    },
    create: {
      code: input.roleCode,
      name: input.roleCode.replaceAll('_', ' '),
    },
    update: {},
  });
  const user = await context.prisma.user.create({
    data: {
      email: `${input.emailPrefix}-${Date.now()}-${userCounter++}@example.test`,
      displayName: input.roleCode.replaceAll('_', ' '),
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

  return {
    userId: user.id,
    roleId: role.id,
  };
}

async function expectNoFabricTopologySideEffects(
  context: IntegrationAppContext,
) {
  const [outboxEvents, auditAnchors] = await Promise.all([
    context.prisma.outboxEvent.count({
      where: {
        eventType: {
          contains: 'FABRIC_CHANNEL',
        },
      },
    }),
    context.prisma.auditAnchor.count(),
  ]);

  expect(outboxEvents).toBe(0);
  expect(auditAnchors).toBe(0);
}
