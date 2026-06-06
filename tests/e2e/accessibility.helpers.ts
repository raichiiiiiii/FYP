import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import type { Result } from 'axe-core';

type AccessibilityOptions = {
  include?: string[];
  disableRules?: string[];
};

export async function expectNoAccessibilityViolations(
  page: Page,
  testInfo: TestInfo,
  options: AccessibilityOptions = {},
) {
  let builder = new AxeBuilder({ page });

  for (const selector of options.include ?? []) {
    builder = builder.include(selector);
  }

  if (options.disableRules?.length) {
    builder = builder.disableRules(options.disableRules);
  }

  const results = await builder.analyze();
  const violations = results.violations.filter(
    (violation) => violation.impact !== 'minor',
  );

  if (violations.length) {
    await testInfo.attach('accessibility-violations.json', {
      body: JSON.stringify(formatViolations(violations), null, 2),
      contentType: 'application/json',
    });
  }

  expect(formatViolations(violations)).toEqual([]);
}

function formatViolations(violations: Result[]) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  }));
}
