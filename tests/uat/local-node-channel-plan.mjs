import { localFederationNodeDefinitions } from './local-node-catalog.mjs';

export const localFederationChannelPlanVersion = '2026-06-07-1';

export const localFederationChannelDefinitions = [
  {
    name: 'tender-market-channel',
    type: 'SHARED_TENDER_COMPETITION',
    sourceNodeKey: 'amanah-retail',
    memberNodeKeys: [
      'amanah-retail',
      'barakah-supplies',
      'ihsan-foods',
      'nur-logistics',
      'salsabil-packaging',
      'taqwa-office',
      'hikmah-health',
    ],
    purpose:
      'Tender announcement, RFQ visibility, supplier bidding, and quotation competition metadata.',
    visibilityScope: 'business-network',
  },
  {
    name: 'award-amanah-barakah-channel',
    type: 'PRIVATE_AWARD_OR_DEAL',
    sourceNodeKey: 'amanah-retail',
    memberNodeKeys: ['amanah-retail', 'barakah-supplies'],
    purpose:
      'Private award, delivery, payment evidence, and procurement workspace metadata.',
    visibilityScope: 'private-award',
  },
  {
    name: 'award-amanah-ihsan-channel',
    type: 'PRIVATE_AWARD_OR_DEAL',
    sourceNodeKey: 'amanah-retail',
    memberNodeKeys: ['amanah-retail', 'ihsan-foods'],
    purpose:
      'Private award, delivery, payment evidence, and procurement workspace metadata.',
    visibilityScope: 'private-award',
  },
  {
    name: 'private-taqwa-salsabil-channel',
    type: 'PRIVATE_AWARD_OR_DEAL',
    sourceNodeKey: 'taqwa-office',
    memberNodeKeys: ['taqwa-office', 'salsabil-packaging'],
    purpose:
      'Private deal negotiation, award evidence, and procurement execution metadata.',
    visibilityScope: 'private-award',
  },
  {
    name: 'private-hikmah-nur-channel',
    type: 'PRIVATE_AWARD_OR_DEAL',
    sourceNodeKey: 'hikmah-health',
    memberNodeKeys: ['hikmah-health', 'nur-logistics'],
    purpose:
      'Private deal negotiation, award evidence, and procurement execution metadata.',
    visibilityScope: 'private-award',
  },
  {
    name: 'finance-data-channel',
    type: 'FINANCE_ENTITY_DATA_SHARING',
    sourceNodeKey: 'mabrur-finance',
    memberNodeKeys: ['mabrur-finance', 'aman-capital', 'safwa-growth'],
    purpose:
      'Finance risk indicators, co-finance review metadata, and non-public finance collaboration.',
    visibilityScope: 'finance-private',
  },
  {
    name: 'finance-mabrur-barakah-channel',
    type: 'FINANCE_BACKUP_SUPPORT',
    sourceNodeKey: 'mabrur-finance',
    memberNodeKeys: ['mabrur-finance', 'barakah-supplies'],
    purpose:
      'Restricted financing support, project monitoring, and evidence sharing metadata.',
    visibilityScope: 'finance-support',
  },
  {
    name: 'finance-aman-capital-ihsan-channel',
    type: 'FINANCE_BACKUP_SUPPORT',
    sourceNodeKey: 'aman-capital',
    memberNodeKeys: ['aman-capital', 'ihsan-foods'],
    purpose:
      'Restricted financing support, project monitoring, and evidence sharing metadata.',
    visibilityScope: 'finance-support',
  },
  {
    name: 'finance-safwa-hikmah-channel',
    type: 'FINANCE_BACKUP_SUPPORT',
    sourceNodeKey: 'safwa-growth',
    memberNodeKeys: ['safwa-growth', 'hikmah-health'],
    purpose:
      'Restricted financing support, project monitoring, and evidence sharing metadata.',
    visibilityScope: 'finance-support',
  },
];

export function getLocalFederationNodeMap() {
  return new Map(
    localFederationNodeDefinitions.map((definition) => [
      definition.key,
      definition,
    ]),
  );
}

export function validateLocalFederationChannelPlan() {
  const nodeMap = getLocalFederationNodeMap();
  const names = new Set();
  const errors = [];

  for (const channel of localFederationChannelDefinitions) {
    if (names.has(channel.name)) {
      errors.push(`Duplicate channel name: ${channel.name}`);
    }
    names.add(channel.name);

    if (!nodeMap.has(channel.sourceNodeKey)) {
      errors.push(`Unknown source node: ${channel.sourceNodeKey}`);
    }

    if (!channel.memberNodeKeys.includes(channel.sourceNodeKey)) {
      errors.push(
        `Source node ${channel.sourceNodeKey} is not a member of ${channel.name}`,
      );
    }

    if (channel.memberNodeKeys.length < 2) {
      errors.push(`Channel ${channel.name} must include at least two nodes`);
    }

    for (const nodeKey of channel.memberNodeKeys) {
      if (!nodeMap.has(nodeKey)) {
        errors.push(`Unknown member node ${nodeKey} in ${channel.name}`);
      }
    }
  }

  return errors;
}
