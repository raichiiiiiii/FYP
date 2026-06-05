import { expect, test } from '@playwright/test';
import {
  createOrganizationViaApi,
  resetDatabase,
  seedHashRecordFabricState,
  setSession,
  type FabricEvidenceState,
} from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

const expectedStates: Array<{
  state: FabricEvidenceState;
  displayStatus: string;
  expectedText: string;
}> = [
  {
    state: 'mock',
    displayStatus: 'mock',
    expectedText: 'Mock anchors are useful for workflow testing',
  },
  {
    state: 'pending',
    displayStatus: 'pending',
    expectedText: 'No verified Fabric proof exists yet',
  },
  {
    state: 'failed',
    displayStatus: 'failed',
    expectedText: 'Fabric anchoring failed for this hash',
  },
  {
    state: 'unavailable',
    displayStatus: 'unavailable',
    expectedText: 'Fabric was unavailable',
  },
  {
    state: 'anchored',
    displayStatus: 'unavailable',
    expectedText: 'could not complete the Fabric chaincode verification query',
  },
  {
    state: 'verified',
    displayStatus: 'unavailable',
    expectedText: 'could not complete the Fabric chaincode verification query',
  },
];

test('SRS-FABRIC-001 hash detail distinguishes Fabric evidence states honestly', async ({
  page,
  request,
}) => {
  const session = await createOrganizationViaApi(request);
  const seeded = [];

  for (const item of expectedStates) {
    seeded.push({
      ...item,
      record: await seedHashRecordFabricState(request, session, item.state),
    });
  }

  await setSession(page, session);

  for (const item of seeded) {
    await page.goto(`/evidence/hashes/${item.record.id}`);
    await expect(
      page.getByRole('heading', { name: 'Hash verification detail' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Verify Fabric anchor' }).click();
    await expect(page.getByText('Fabric verification state loaded')).toBeVisible();

    const panel = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Fabric verification result' }) })
      .last();

    await expect(panel).toContainText(item.displayStatus);
    await expect(panel).toContainText(item.expectedText);
    if (item.state === 'mock') {
      await expect(panel).toContainText('Mock anchors are not real');
    }

    await expect(panel).toContainText('No');
  }
});
