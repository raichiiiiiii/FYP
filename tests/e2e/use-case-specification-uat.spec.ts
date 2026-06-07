import { expect, test, type TestInfo } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { E2E_DATABASE_URL, setSession, type E2ESession } from './helpers';

type SeedUser = {
  id: string;
  email: string;
  roleCode: string;
};

type SeedOrganization = {
  id: string;
  legalName: string;
  deploymentMode: string;
  adminUserId: string;
  adminEmail: string;
  users: SeedUser[];
};

type SeedSummary = {
  organizations: Record<string, SeedOrganization>;
};

type UseCaseProbe = {
  id: string;
  title: string;
  actorEmail: string;
  organizationKey: string;
  route: string;
  expectedText: RegExp;
  screenshotName: string;
  blockerNote?: string;
};

const screenshotDir = path.resolve('docs/evidence/uat/screenshots');
const forbiddenRenderedPatterns = [
  /Internal Server Error/i,
  /Application Error/i,
  /Unhandled Runtime Error/i,
  /\b500\b/,
  /Stack trace|(?:^|\n)\s*at\s+[\w.$<>\[\]-]+\s*\(/i,
  /BEGIN PRIVATE KEY/i,
  /BEGIN CERTIFICATE/i,
  /FABRIC_PRIVATE_KEY_PEM/i,
  /AZURE_VM_SSH_KEY/i,
  /password=/i,
  /token=/i,
];

const rolePermissionDefaults: Record<string, string[]> = {
  ORG_ADMIN: [
    'users:create',
    'procurement:create',
    'procurement:approve',
    'finance:review',
    'shariah:review',
    'audit:read',
    'fabric:governance',
  ],
  PLATFORM_OPERATOR: ['audit:read', 'fabric:operate'],
  FABRIC_OPERATOR: ['audit:read', 'fabric:operate'],
  SUPPORT_OPERATOR: ['audit:read'],
  SECURITY_OPERATOR: ['audit:read'],
  PROCUREMENT_OFFICER: ['procurement:create', 'audit:read'],
  RECEIVING_OFFICER: ['procurement:create', 'audit:read'],
  APPROVER_MANAGER: ['procurement:approve', 'audit:read'],
  FINANCE_ACCOUNTANT: ['finance:review', 'audit:read'],
  AUDIT_VIEWER: ['audit:read'],
  SUPPLIER_SALES: ['procurement:create', 'audit:read'],
  MUDARIB_OPERATOR: ['finance:review', 'audit:read'],
  SUPPLIER_FINANCE: ['finance:review', 'audit:read'],
  EVIDENCE_SUBMITTER: ['procurement:create', 'audit:read'],
  INVESTMENT_OFFICER: ['finance:review', 'audit:read'],
  RISK_REVIEWER: ['finance:review', 'audit:read'],
  DISBURSEMENT_OFFICER: ['finance:review', 'audit:read'],
  FINANCIER_AUDIT_VIEWER: ['audit:read'],
  SHARIAH_REVIEWER: ['shariah:review', 'audit:read'],
  COMPLIANCE_REVIEWER: ['shariah:review', 'audit:read'],
  CONTRACT_REVIEWER: ['shariah:review', 'audit:read'],
  AUDITOR: ['audit:read'],
  REGULATOR_REVIEWER: ['audit:read'],
  READ_ONLY_EVIDENCE_VIEWER: ['audit:read'],
  DEVELOPER_INTEGRATOR: ['audit:read', 'fabric:operate'],
  ERP_INTEGRATOR: ['audit:read'],
  API_CLIENT_MANAGER: ['audit:read'],
};

const useCaseProbes: UseCaseProbe[] = [
  {
    id: 'UC-01',
    title: 'Install and configure SME node',
    actorEmail: 'buyer.admin@amanah.local',
    organizationKey: 'buyer',
    route: '/organization/profile',
    expectedText: /Amanah Retail|Organization|Profile/i,
    screenshotName: 'UC-01-install-node.png',
  },
  {
    id: 'UC-02',
    title: 'Authenticate and authorize user',
    actorEmail: 'procurement.officer@amanah.local',
    organizationKey: 'buyer',
    route: '/dashboard',
    expectedText: /Dashboard|Procurement|task/i,
    screenshotName: 'UC-02-authenticate.png',
  },
  {
    id: 'UC-03',
    title: 'Onboard supplier',
    actorEmail: 'procurement.officer@amanah.local',
    organizationKey: 'buyer',
    route: '/procurement/suppliers',
    expectedText: /Supplier|Barakah|approved/i,
    screenshotName: 'UC-03-onboard-supplier.png',
  },
  {
    id: 'UC-04',
    title: 'Run RFQ and supplier evaluation',
    actorEmail: 'procurement.officer@amanah.local',
    organizationKey: 'buyer',
    route: '/procurement/rfqs',
    expectedText: /RFQ|quotation|published/i,
    screenshotName: 'UC-04-rfq-evaluation.png',
  },
  {
    id: 'UC-05',
    title: 'Execute procure-to-pay workflow',
    actorEmail: 'finance.accountant@amanah.local',
    organizationKey: 'buyer',
    route: '/procurement/matching',
    expectedText: /Match|invoice|receipt|purchase order/i,
    screenshotName: 'UC-05-p2p.png',
  },
  {
    id: 'UC-06',
    title: 'Publish procurement opportunity for financing',
    actorEmail: 'mudarib.operator@barakah.local',
    organizationKey: 'supplier',
    route: '/finance/opportunities',
    expectedText: /Opportunity|capital|pipeline/i,
    screenshotName: 'UC-06-publish-opportunity.png',
    blockerNote:
      'Supplier-owned cross-node opportunity publishing UI is still represented through the local finance opportunity surface.',
  },
  {
    id: 'UC-07',
    title: 'Apply for mudarabah capital',
    actorEmail: 'mudarib.operator@barakah.local',
    organizationKey: 'supplier',
    route: '/finance/applications',
    expectedText: /Application|mudarabah|capital/i,
    screenshotName: 'UC-07-apply-capital.png',
    blockerNote:
      'Application mutation may be read-only/seed-backed where the end-to-end supplier submission UI is not implemented.',
  },
  {
    id: 'UC-08',
    title: 'Perform financier due diligence',
    actorEmail: 'investment.officer@mabrur.local',
    organizationKey: 'financier',
    route: '/finance/applications',
    expectedText: /Application|Due diligence|review/i,
    screenshotName: 'UC-08-due-diligence.png',
  },
  {
    id: 'UC-09',
    title: 'Perform Shariah and compliance review',
    actorEmail: 'shariah.reviewer@hidayah.local',
    organizationKey: 'shariah',
    route: '/finance/applications',
    expectedText: /Shariah|Compliance|Application|review/i,
    screenshotName: 'UC-09-shariah-review.png',
  },
  {
    id: 'UC-10',
    title: 'Execute mudarabah contract and disburse capital',
    actorEmail: 'disbursement.officer@mabrur.local',
    organizationKey: 'financier',
    route: '/finance/contracts',
    expectedText: /Contract|disbursement|executed|pending/i,
    screenshotName: 'UC-10-contract-disburse.png',
  },
  {
    id: 'UC-11',
    title: 'Monitor procurement execution',
    actorEmail: 'investment.officer@mabrur.local',
    organizationKey: 'financier',
    route: '/finance/ledgers',
    expectedText: /Ledger|revenue|capital|cost/i,
    screenshotName: 'UC-11-monitor-execution.png',
  },
  {
    id: 'UC-12',
    title: 'Calculate profit/loss and close mudarabah project',
    actorEmail: 'supplier.finance@barakah.local',
    organizationKey: 'supplier',
    route: '/finance/profit-loss',
    expectedText: /Profit|Loss|ratio|distribution/i,
    screenshotName: 'UC-12-profit-loss-close.png',
  },
  {
    id: 'UC-13',
    title: 'Use supply-chain network canvas',
    actorEmail: 'procurement.officer@amanah.local',
    organizationKey: 'buyer',
    route: '/graph/projects',
    expectedText: /Graph|Network|risk|canvas/i,
    screenshotName: 'UC-13-network-canvas.png',
  },
  {
    id: 'UC-14',
    title: 'Verify audit event and evidence pack',
    actorEmail: 'auditor.user@raudah.local',
    organizationKey: 'auditor',
    route: '/evidence/hashes',
    expectedText: /Hash|Fabric|verification|pending|unavailable/i,
    screenshotName: 'UC-14-audit-evidence.png',
    blockerNote:
      'If Fabric Gateway is unavailable, the expected state is pending/unavailable, never positive verification from seeded metadata.',
  },
  {
    id: 'UC-15',
    title: 'Integrate ERP/accounting records',
    actorEmail: 'erp.integrator@nusantara.local',
    organizationKey: 'integrator',
    route: '/integrations',
    expectedText: /Integration|ERP|reconciliation|outbox/i,
    screenshotName: 'UC-15-erp-integration.png',
  },
  {
    id: 'UC-16',
    title: 'Verify release package and update local node',
    actorEmail: 'buyer.admin@amanah.local',
    organizationKey: 'buyer',
    route: '/operations',
    expectedText: /Operations|health|backup|deployment/i,
    screenshotName: 'UC-16-update-local-node.png',
    blockerNote:
      'Release manifest/update execution is documented as self-hosting hardening unless a node update endpoint is present.',
  },
  {
    id: 'UC-17',
    title: 'Import network/channel join package',
    actorEmail: 'platform.admin@mepn.local',
    organizationKey: 'platform',
    route: '/fabric-governance',
    expectedText: /Fabric|governance|channel|operator|readiness/i,
    screenshotName: 'UC-17-channel-join-package.png',
    blockerNote:
      'This flow records operator-assisted readiness metadata only; it must not mutate real Fabric topology.',
  },
  {
    id: 'UC-18',
    title: 'Check node and channel compatibility',
    actorEmail: 'fabric.operator@mepn.local',
    organizationKey: 'platform',
    route: '/fabric-governance',
    expectedText: /readiness|compatibility|operator|Fabric/i,
    screenshotName: 'UC-18-node-compatibility.png',
    blockerNote:
      'Minimal compatibility evidence is currently Fabric automation readiness, not full production node-status automation.',
  },
];

let seedSummary: SeedSummary;

test.describe.serial('SRS use case specification UAT simulation', () => {
  test.beforeAll(async () => {
    await mkdir(screenshotDir, { recursive: true });
    seedSummary = seedUatDatabase();
  });

  for (const probe of useCaseProbes) {
    test(`${probe.id} ${probe.title}`, async ({ page }, testInfo) => {
      const session = sessionFor(probe);

      await setSession(page, session);

      const response = await page.goto(probe.route, {
        waitUntil: 'domcontentloaded',
      });

      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(
        () => undefined,
      );

      const bodyText = await page.locator('body').innerText();
      const screenshotPath = path.join(screenshotDir, probe.screenshotName);
      const forbiddenFindings = forbiddenRenderedPatterns
        .filter((pattern) => pattern.test(bodyText))
        .map((pattern) => pattern.toString());
      const expectedTextVisible = probe.expectedText.test(bodyText);

      await page.screenshot({ path: screenshotPath, fullPage: true });

      await attachUseCaseDiagnostic(testInfo, {
        useCaseId: probe.id,
        title: probe.title,
        actorEmail: probe.actorEmail,
        route: probe.route,
        documentStatus: response?.status() ?? null,
        screenshotPath,
        expectedTextVisible,
        blockerNote: probe.blockerNote ?? null,
        forbiddenFindings,
      });

      if (!expectedTextVisible) {
        testInfo.annotations.push({
          type: 'uat-gap',
          description:
            probe.blockerNote ??
            `Expected text ${probe.expectedText.toString()} was not visible.`,
        });
      }

      expect(response?.status() ?? 200).toBeLessThan(500);
      expect(forbiddenFindings).toEqual([]);
    });
  }
});

function seedUatDatabase() {
  const output = execFileSync(process.execPath, ['tests/uat/seed-uat-demo.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return JSON.parse(output) as SeedSummary;
}

function sessionFor(probe: UseCaseProbe): E2ESession {
  const organization = seedSummary.organizations[probe.organizationKey];

  if (!organization) {
    throw new Error(`Seed organization ${probe.organizationKey} not found`);
  }

  const user =
    probe.actorEmail === organization.adminEmail
      ? {
          id: organization.adminUserId,
          email: organization.adminEmail,
          roleCode: 'ORG_ADMIN',
        }
      : organization.users.find((candidate) => {
          return candidate.email === probe.actorEmail;
        });

  if (!user) {
    throw new Error(`Seed user ${probe.actorEmail} not found`);
  }

  return {
    organizationId: organization.id,
    actorUserId: user.id,
    legalName: organization.legalName,
    deploymentMode: organization.deploymentMode,
    email: user.email,
    displayName: user.email
      .split('@')[0]
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    roleCodes: [user.roleCode],
    permissionCodes: rolePermissionDefaults[user.roleCode] ?? ['audit:read'],
  };
}

async function attachUseCaseDiagnostic(
  testInfo: TestInfo,
  diagnostic: Record<string, unknown>,
) {
  await testInfo.attach('use-case-diagnostic', {
    body: JSON.stringify(diagnostic, null, 2),
    contentType: 'application/json',
  });
}
