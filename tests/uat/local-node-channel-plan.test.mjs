import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  localFederationChannelDefinitions,
  validateLocalFederationChannelPlan,
} from './local-node-channel-plan.mjs';
import { localFederationNodeDefinitions } from './local-node-catalog.mjs';

describe('local federation channel plan', () => {
  it('has no duplicate channels, unknown nodes, or invalid source memberships', () => {
    assert.deepEqual(validateLocalFederationChannelPlan(), []);
  });

  it('connects all seven business nodes to the tender market channel', () => {
    const businessNodeKeys = localFederationNodeDefinitions
      .filter((node) => node.category === 'business')
      .map((node) => node.key)
      .sort();
    const tender = localFederationChannelDefinitions.find(
      (channel) => channel.name === 'tender-market-channel',
    );

    assert.ok(tender);
    assert.equal(tender.type, 'SHARED_TENDER_COMPETITION');
    assert.deepEqual([...tender.memberNodeKeys].sort(), businessNodeKeys);
  });

  it('keeps the private finance-data channel restricted to finance nodes', () => {
    const financeNodeKeys = localFederationNodeDefinitions
      .filter((node) => node.category === 'finance')
      .map((node) => node.key)
      .sort();
    const financeData = localFederationChannelDefinitions.find(
      (channel) => channel.name === 'finance-data-channel',
    );

    assert.ok(financeData);
    assert.equal(financeData.type, 'FINANCE_ENTITY_DATA_SHARING');
    assert.deepEqual([...financeData.memberNodeKeys].sort(), financeNodeKeys);
  });

  it('includes award/deal and finance support channels for reviewer scenarios', () => {
    const awardChannels = localFederationChannelDefinitions.filter(
      (channel) => channel.type === 'PRIVATE_AWARD_OR_DEAL',
    );
    const financeSupportChannels = localFederationChannelDefinitions.filter(
      (channel) => channel.type === 'FINANCE_BACKUP_SUPPORT',
    );

    assert.equal(awardChannels.length, 4);
    assert.equal(financeSupportChannels.length, 3);
  });
});
