import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  findLocalFederationNode,
  localFederationNodeDefinitions,
} from './local-node-catalog.mjs';
import {
  businessActivitiesForRole,
  businessActivityPlanVersion,
  knownBusinessActivityRoleCodes,
  minimumBusinessActivitiesPerUser,
} from './local-node-business-activity.mjs';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

process.env.DATABASE_URL ||= 'postgresql://mepn:mepn@localhost:5432/mepn';

const { PrismaClient } = await import(
  pathToFileURL(
    path.join(rootDir, 'apps/api/node_modules/@prisma/client/index.js'),
  )
);
const { PrismaPg } = await import(
  pathToFileURL(
    path.join(
      rootDir,
      'apps/api/node_modules/@prisma/adapter-pg/dist/index.mjs',
    ),
  )
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const inboxItemType = 'UAT_BUSINESS_ACTIVITY';
const simulationSource = 'tests/uat/simulate-node-business-activity.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const nodeKey = args.nodeKey || process.env.MEPN_NODE_KEY;

if (!nodeKey) {
  printHelp();
  throw new Error('Missing --node <node-key> or MEPN_NODE_KEY.');
}

const catalogDefinition = findLocalFederationNode(nodeKey);

if (!catalogDefinition) {
  throw new Error(
    `Unknown node key "${nodeKey}". Known nodes: ${localFederationNodeDefinitions
      .map((node) => node.key)
      .join(', ')}`,
  );
}

const nodeDefinition = applySingleNodeEnvOverrides(catalogDefinition);

try {
  const summary = await simulateNodeBusinessActivity({
    nodeDefinition,
    dryRun: args.dryRun,
  });
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await prisma.$disconnect();
}

async function simulateNodeBusinessActivity({ nodeDefinition, dryRun }) {
  const organization = await prisma.organization.findFirst({
    where: { registrationNumber: nodeDefinition.registrationNumber },
  });

  if (!organization) {
    throw new Error(
      `Organization for node ${nodeDefinition.key} was not found. Run seed-uat-demo.mjs --node ${nodeDefinition.key} first.`,
    );
  }

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: organization.id,
      status: 'active',
    },
    include: {
      role: true,
      user: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (memberships.length === 0) {
    throw new Error(
      `Organization ${organization.legalName} has no active memberships to simulate.`,
    );
  }

  const adminMembership =
    memberships.find((membership) => membership.role.code === 'ORG_ADMIN') ??
    memberships[0];
  const eventTypes = allKnownActivityEventTypes();
  const userSummaries = [];
  let auditEventCount = 0;
  let inboxItemCount = 0;

  if (!dryRun) {
    await prisma.auditEvent.deleteMany({
      where: {
        organizationId: organization.id,
        eventType: {
          in: eventTypes,
        },
      },
    });
    await prisma.inboxItem.deleteMany({
      where: {
        organizationId: organization.id,
        itemType: inboxItemType,
      },
    });
  }

  for (const membership of memberships) {
    const roleCode = membership.role.code;
    const activities = businessActivitiesForRole(roleCode).slice(
      0,
      minimumBusinessActivitiesPerUser,
    );

    if (activities.length < minimumBusinessActivitiesPerUser) {
      throw new Error(
        `Role ${roleCode} has only ${activities.length} activities; expected at least ${minimumBusinessActivitiesPerUser}.`,
      );
    }

    if (!dryRun) {
      for (const activity of activities) {
        await createAuditEvent({
          organizationId: organization.id,
          actorUserId: membership.user.id,
          nodeDefinition,
          membership,
          activity,
        });
        auditEventCount += 1;

        await createInboxItem({
          organizationId: organization.id,
          senderUserId: adminMembership.user.id,
          recipientUserId: membership.user.id,
          nodeDefinition,
          membership,
          activity,
        });
        inboxItemCount += 1;
      }
    } else {
      auditEventCount += activities.length;
      inboxItemCount += activities.length;
    }

    userSummaries.push({
      email: membership.user.email,
      displayName: membership.user.displayName,
      roleCode,
      activityCount: activities.length,
      routes: activities.map((activity) => activity.route),
    });
  }

  return {
    mode: 'single-organization-node-business-activity-simulation',
    dryRun,
    generatedAt: new Date().toISOString(),
    planVersion: businessActivityPlanVersion,
    node: {
      key: nodeDefinition.key,
      category: nodeDefinition.category,
      type: nodeDefinition.type,
      publicWebUrl: nodeDefinition.webUrl,
      publicApiUrl: nodeDefinition.apiUrl,
    },
    organization: {
      id: organization.id,
      legalName: organization.legalName,
      registrationNumber: organization.registrationNumber,
      deploymentMode: organization.deploymentMode,
    },
    users: userSummaries,
    totals: {
      userCount: userSummaries.length,
      minimumActivitiesPerUser: minimumBusinessActivitiesPerUser,
      auditEventCount,
      inboxItemCount,
      totalActivityRecords: auditEventCount + inboxItemCount,
    },
    evidenceBoundary:
      'UAT activity records are simulated audit/inbox traces only. They do not create real Fabric proof, real topology mutation, real payment execution, or guaranteed/fixed mudarabah returns.',
  };
}

async function createAuditEvent({
  organizationId,
  actorUserId,
  nodeDefinition,
  membership,
  activity,
}) {
  await prisma.auditEvent.create({
    data: {
      organizationId,
      actorUserId,
      eventType: activity.eventType,
      entityType: activity.entityType,
      entityId: `${nodeDefinition.key}:${membership.user.email}:${activity.id}`,
      correlationId: `uat-business-activity:${nodeDefinition.key}:${membership.user.email}:${activity.id}`,
      metadata: buildActivityMetadata({ nodeDefinition, membership, activity }),
    },
  });
}

async function createInboxItem({
  organizationId,
  senderUserId,
  recipientUserId,
  nodeDefinition,
  membership,
  activity,
}) {
  await prisma.inboxItem.create({
    data: {
      organizationId,
      senderUserId,
      recipientUserId,
      itemType: inboxItemType,
      subject: `[UAT activity] ${activity.title}`,
      body: `${activity.description}\n\nRoute: ${activity.route}\nBoundary: simulated UAT activity only; not real Fabric proof or real payment execution.`,
      status: 'unread',
      metadata: buildActivityMetadata({ nodeDefinition, membership, activity }),
    },
  });
}

function buildActivityMetadata({ nodeDefinition, membership, activity }) {
  return {
    ...activity.metadata,
    source: simulationSource,
    planVersion: businessActivityPlanVersion,
    nodeKey: nodeDefinition.key,
    nodeCategory: nodeDefinition.category,
    roleCode: membership.role.code,
    userEmail: membership.user.email,
    featureArea: activity.featureArea,
    route: activity.route,
    activityId: activity.id,
    title: activity.title,
    description: activity.description,
  };
}

function allKnownActivityEventTypes() {
  return [
    ...new Set(
      knownBusinessActivityRoleCodes().flatMap((roleCode) =>
        businessActivitiesForRole(roleCode).map((activity) => activity.eventType),
      ),
    ),
  ];
}

function applySingleNodeEnvOverrides(definition) {
  return {
    ...definition,
    type: process.env.MEPN_NODE_ORG_TYPE?.trim() || definition.type,
    legalName: process.env.MEPN_NODE_ORG_NAME?.trim() || definition.legalName,
    webUrl:
      process.env.MEPN_NODE_PUBLIC_WEB_URL?.trim() || definition.webUrl,
    apiUrl:
      process.env.MEPN_NODE_PUBLIC_API_URL?.trim() || definition.apiUrl,
  };
}

function parseArgs(rawArgs) {
  const parsed = {
    dryRun: false,
    help: false,
    nodeKey: undefined,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--node') {
      parsed.nodeKey = rawArgs[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node tests/uat/simulate-node-business-activity.mjs --node <node-key> [--dry-run]

Creates at least ${minimumBusinessActivitiesPerUser} UAT-labelled AuditEvent and InboxItem records for each active user in one local node database.

Known nodes:
${localFederationNodeDefinitions.map((node) => `  - ${node.key}`).join('\n')}
`);
}
