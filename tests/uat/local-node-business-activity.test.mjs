import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localFederationNodeDefinitions } from './local-node-catalog.mjs';
import {
  businessActivitiesForRole,
  knownBusinessActivityRoleCodes,
  minimumBusinessActivitiesPerUser,
} from './local-node-business-activity.mjs';

const unsafePatterns = [
  /BEGIN PRIVATE KEY/i,
  /BEGIN CERTIFICATE/i,
  /FABRIC_PRIVATE_KEY_PEM/i,
  /AZURE_VM_SSH_KEY/i,
  /password=/i,
  /token=/i,
  /verified\s*=\s*true/i,
  /real fabric proof/i,
  /real payment execution/i,
];

describe('local node business activity templates', () => {
  it('covers every seeded role with at least seven activities', () => {
    const seededRoleCodes = new Set();

    for (const node of localFederationNodeDefinitions) {
      for (const user of [node.admin, ...node.users]) {
        seededRoleCodes.add(user.roleCode);
      }
    }

    for (const roleCode of seededRoleCodes) {
      assert.equal(
        knownBusinessActivityRoleCodes().includes(roleCode),
        true,
        `missing activity template for role ${roleCode}`,
      );
      assert.equal(
        businessActivitiesForRole(roleCode).length >= minimumBusinessActivitiesPerUser,
        true,
        `role ${roleCode} has fewer than ${minimumBusinessActivitiesPerUser} activities`,
      );
    }
  });

  it('keeps activity ids unique within each role', () => {
    for (const roleCode of knownBusinessActivityRoleCodes()) {
      const ids = new Set();
      for (const activity of businessActivitiesForRole(roleCode)) {
        assert.equal(ids.has(activity.id), false, `${roleCode}:${activity.id}`);
        ids.add(activity.id);
      }
    }
  });

  it('keeps activity text and metadata safe for committed UAT evidence', () => {
    for (const roleCode of knownBusinessActivityRoleCodes()) {
      for (const activity of businessActivitiesForRole(roleCode)) {
        const text = [
          roleCode,
          activity.id,
          activity.eventType,
          activity.featureArea,
          activity.route,
          activity.title,
          activity.description,
          JSON.stringify(activity.metadata),
        ].join('\n');

        for (const pattern of unsafePatterns) {
          assert.equal(
            pattern.test(text),
            false,
            `${roleCode}:${activity.id} matched ${pattern}`,
          );
        }

        assert.equal(activity.metadata.safeForEvidence, true);
        assert.equal(activity.metadata.simulatedOnly, true);
        assert.equal(activity.metadata.realFabricProof, false);
        assert.equal(activity.metadata.realPaymentExecution, false);
      }
    }
  });
});
