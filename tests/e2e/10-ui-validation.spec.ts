import { expect, test } from '@playwright/test';
import { resetDatabase } from './helpers';

test.beforeEach(async () => {
  await resetDatabase();
});

test('SRS-UI-VALIDATION-001 required fields show validation errors before submit', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();

  await page.goto('/org/setup');
  await page.getByLabel('Legal name').fill('');
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page.getByText('Legal name is required.')).toBeVisible();
});
