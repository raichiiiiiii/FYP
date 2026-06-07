import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultSeedPassword,
  localFederationNodeDefinitions,
} from './local-node-catalog.mjs';

describe('local multi-node UAT catalog', () => {
  it('defines seven business nodes, three finance nodes, and the default password', () => {
    assert.equal(defaultSeedPassword, 'password');
    assert.equal(localFederationNodeDefinitions.length, 10);
    assert.equal(
      localFederationNodeDefinitions.filter((node) => node.category === 'business')
        .length,
      7,
    );
    assert.equal(
      localFederationNodeDefinitions.filter((node) => node.category === 'finance')
        .length,
      3,
    );
  });

  it('keeps node keys, ports, and seeded emails unique', () => {
    const keys = new Set();
    const webUrls = new Set();
    const apiUrls = new Set();
    const emails = new Set();

    for (const node of localFederationNodeDefinitions) {
      assert.equal(keys.has(node.key), false, `duplicate node key ${node.key}`);
      assert.equal(
        webUrls.has(node.webUrl),
        false,
        `duplicate web URL ${node.webUrl}`,
      );
      assert.equal(
        apiUrls.has(node.apiUrl),
        false,
        `duplicate API URL ${node.apiUrl}`,
      );
      keys.add(node.key);
      webUrls.add(node.webUrl);
      apiUrls.add(node.apiUrl);

      for (const user of [node.admin, ...node.users]) {
        assert.equal(
          emails.has(user.email),
          false,
          `duplicate email ${user.email}`,
        );
        emails.add(user.email);
      }
    }
  });

  it('assigns the required local users by node category', () => {
    for (const node of localFederationNodeDefinitions) {
      const emails = [node.admin, ...node.users].map((user) => user.email);
      assert.equal(emails.includes(`admin@${node.key}.local`), true);

      if (node.category === 'business') {
        assert.deepEqual(
          emails,
          [
            `admin@${node.key}.local`,
            `procurement@${node.key}.local`,
            `approver@${node.key}.local`,
            `finance@${node.key}.local`,
            `receiving@${node.key}.local`,
            `sales@${node.key}.local`,
            `mudarib@${node.key}.local`,
          ],
        );
      } else {
        assert.deepEqual(
          emails,
          [
            `admin@${node.key}.local`,
            `investment@${node.key}.local`,
            `risk@${node.key}.local`,
            `disbursement@${node.key}.local`,
            `audit@${node.key}.local`,
          ],
        );
      }
    }
  });
});
