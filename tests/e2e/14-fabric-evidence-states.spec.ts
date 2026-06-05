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
  status: string;
  expectedText: string;
}> = [
  {
    state: 'mock',
    status: 'ANCHORED_MOCK',
    expectedText: 'Mock anchors are useful for workflow testing',
  },
  {
    state: 'pending',
    status: 'ANCHOR_REQUESTED',
    expectedText: 'No verified Fabric proof exists yet',
  },
  {
    state: 'failed',
    status: 'FAILED',
    expectedText: 'Fabric anchoring failed for this hash',
  },
  {
    state: 'unavailable',
    status: 'FABRIC_UNAVAILABLE',
    expectedText: 'Fabric was unavailable',
  },
  {
    state: 'anchored',
    status: 'ANCHORED_NOT_FULLY_VERIFIED',
    expectedText: 'Treat this as anchored, not fully verified',
  },
  {
    state: 'verified',
    status: 'VERIFIED',
    expectedText: 'marked verified',
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

    await expect(panel).toContainText(item.status);
    await expect(panel).toContainText(item.expectedText);
    await expect(panel).toContainText(
      'Direct chaincode query is not available from this API yet',
    );

    if (item.state === 'verified') {
      await expect(panel).toContainText('Verified');
      await expect(panel).toContainText('Yes');
    } else {
      await expect(panel).toContainText('No');
    }
  }
});
