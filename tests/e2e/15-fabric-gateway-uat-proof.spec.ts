import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { setSession, type E2ESession } from './helpers';

const hashRecordId = process.env.FABRIC_GATEWAY_UAT_HASH_RECORD_ID;
const organizationId = process.env.FABRIC_GATEWAY_UAT_ORGANIZATION_ID;
const actorUserId = process.env.FABRIC_GATEWAY_UAT_USER_ID;
const screenshotDir = path.resolve('docs/evidence/uat');

test.skip(
  !hashRecordId || !organizationId || !actorUserId,
  'Set FABRIC_GATEWAY_UAT_HASH_RECORD_ID, FABRIC_GATEWAY_UAT_ORGANIZATION_ID, and FABRIC_GATEWAY_UAT_USER_ID to capture real Fabric Gateway proof screenshots.',
);

test('UAT-FABRIC-GATEWAY hash record proof panel shows real on-chain verification', async ({
  page,
}) => {
  await mkdir(screenshotDir, { recursive: true });
  await setSession(page, uatSession());

  await page.goto(`/evidence/hashes/${hashRecordId}`);
  await expect(
    page.getByRole('heading', { name: 'Hash verification detail' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Verify Fabric anchor' }).click();

  const panel = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: 'Fabric verification result' }),
    })
    .last();

  await expect(panel).toContainText('Fabric Gateway');
  await expect(panel).toContainText('On-chain verified');
  await expect(panel).toContainText('Yes');
  await expect(panel).toContainText('Transaction ID');
  await expect(panel).toContainText('ReadAnchor returned matching on-chain evidence');
  await expect(panel).not.toContainText(/mock/i);

  await panel.screenshot({
    path: path.join(screenshotDir, 'fabric-gateway-proof-panel.png'),
  });
  await page.screenshot({
    path: path.join(
      screenshotDir,
      'fabric-gateway-hash-record-verification.png',
    ),
    fullPage: true,
  });
});

function uatSession(): E2ESession {
  return {
    organizationId: organizationId!,
    legalName:
      process.env.FABRIC_GATEWAY_UAT_ORGANIZATION_NAME ||
      'Fabric Gateway UAT Organization',
    actorUserId: actorUserId!,
    email:
      process.env.FABRIC_GATEWAY_UAT_USER_EMAIL || 'auditor.fabric.uat@mepn.local',
    displayName: 'Fabric Gateway UAT Auditor',
    roleCodes: ['AUDITOR'],
    permissionCodes: ['audit:read'],
  };
}
