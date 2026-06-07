import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { missingFabricGatewayConfig } from '../../config/fabric-env';
import { PrismaService } from '../../database/prisma.service';
import { getAuthRuntimeConfig } from '../auth/auth.config';
import { getFabricUatBlockerDecisionResponse } from '../integrations/fabric-governance/fabric-uat-blocker-decisions';
import { getFabricTopologyAutomationReadiness } from '../integrations/fabric-governance/fabric-topology-automation-readiness';
import {
  type NodeStatusDatabaseDto,
  type NodeStatusResponseDto,
  type NodeStatusValue,
} from './node-status.dto';

type MigrationCountRow = {
  count: bigint | number | string;
};

type LatestMigrationRow = {
  migration_name: string;
};

type PackageMetadata = {
  name: string;
  version: string;
  source: 'package-json' | 'fallback';
};

@Injectable()
export class NodeStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<NodeStatusResponseDto> {
    const [database, release] = await Promise.all([
      this.getDatabaseStatus(),
      Promise.resolve(readPackageMetadata()),
    ]);
    const authConfig = getAuthRuntimeConfig(process.env);
    const fabricReadiness = getFabricTopologyAutomationReadiness(process.env);
    const fabricUatDecisions = getFabricUatBlockerDecisionResponse();
    const missingGatewayConfig = missingFabricGatewayConfig(process.env);

    return {
      service: 'mepn-api',
      checkedAt: new Date().toISOString(),
      release: {
        appName: release.name,
        appVersion: release.version,
        packageSource: release.source,
      },
      deployment: {
        model: 'self-hosted-organization-node',
        environment: process.env.NODE_ENV || 'development',
        localSystemOfRecord: true,
        sharedCloudRequired: false,
      },
      database,
      compatibility: {
        apiVersion: 'v1',
        canonicalHashVersion: 'v1',
        reportSchemaVersion: 'v1',
        channelJoinPackageVersion: 'v1',
        fabricTopologyMode: 'operator_assisted',
        topologyMutationSupported: false,
      },
      featureFlags: [
        {
          id: 'dev-auth',
          label: 'Development login boundary',
          enabled: authConfig.devAuthEnabled,
          source: 'environment',
        },
        {
          id: 'local-seeded-auth',
          label: 'Local seeded login boundary',
          enabled: authConfig.passwordAuthEnabled,
          source: 'environment',
        },
        {
          id: 'oidc',
          label: 'OIDC login boundary',
          enabled: authConfig.oidcEnabled,
          source: 'environment',
        },
        {
          id: 'fabric-topology-automation',
          label: 'Fabric topology operator-agent automation',
          enabled: fabricReadiness.enabled,
          source: 'environment',
        },
      ],
      fabric: {
        proofInfrastructureOptional: true,
        topologyMutationSupported: false,
        automationReadinessEndpoint: '/api/v1/fabric/automation/readiness',
        uatBlockerDecisionEndpoint: '/api/v1/fabric/uat-blocker-decisions',
        uatBlockerDecisions: fabricUatDecisions.decisions.map((decision) => ({
          id: decision.id,
          status: decision.status,
          topologyMutationSupported: decision.topologyMutationSupported,
          liveEvidenceRequired: decision.liveEvidenceRequired,
        })),
        automationStatus: fabricReadiness.status,
        automationEnabled: fabricReadiness.enabled,
        configuredChannel: configuredStatus(
          process.env.FABRIC_CHANNEL || process.env.FABRIC_CHANNEL_NAME,
        ),
        configuredChaincode: configuredStatus(
          process.env.FABRIC_CHAINCODE || process.env.FABRIC_CHAINCODE_NAME,
        ),
        configuredMspId: configuredStatus(process.env.FABRIC_MSP_ID),
        gatewayConfigured: missingGatewayConfig.length === 0,
        missingGatewayConfig,
      },
    };
  }

  private async getDatabaseStatus(): Promise<NodeStatusDatabaseDto> {
    try {
      const [countRows, latestRows] = await Promise.all([
        this.prisma.$queryRaw<MigrationCountRow[]>`
          SELECT COUNT(*) AS count FROM "_prisma_migrations"
          WHERE finished_at IS NOT NULL
        `,
        this.prisma.$queryRaw<LatestMigrationRow[]>`
          SELECT migration_name FROM "_prisma_migrations"
          WHERE finished_at IS NOT NULL
          ORDER BY finished_at DESC
          LIMIT 1
        `,
      ]);

      return {
        provider: 'postgresql',
        schemaProvider: 'prisma',
        migrationStatus: 'available',
        appliedMigrationCount: toNumber(countRows[0]?.count),
        latestMigration: latestRows[0]?.migration_name ?? null,
      };
    } catch {
      return {
        provider: 'postgresql',
        schemaProvider: 'prisma',
        migrationStatus: 'unavailable',
        appliedMigrationCount: 0,
        latestMigration: null,
      };
    }
  }
}

function configuredStatus(value: string | undefined): NodeStatusValue {
  return value?.trim() ? 'configured' : 'missing';
}

function toNumber(value: bigint | number | string | undefined): number {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readPackageMetadata(): PackageMetadata {
  const packagePath = findRootPackageJson();

  if (!packagePath) {
    return {
      name: 'mepn',
      version: '0.0.0-local',
      source: 'fallback',
    };
  }

  const parsed: unknown = JSON.parse(readFileSync(packagePath, 'utf8'));

  if (!isJsonObject(parsed)) {
    return {
      name: 'mepn',
      version: '0.0.0-local',
      source: 'fallback',
    };
  }

  return {
    name: stringField(parsed, 'name', 'mepn'),
    version: stringField(parsed, 'version', '0.0.0-local'),
    source: 'package-json',
  };
}

function findRootPackageJson(): string | null {
  let current = resolve(process.cwd());
  let fallback: string | null = null;

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(current, 'package.json');

    if (existsSync(candidate)) {
      fallback ??= candidate;

      try {
        const parsed: unknown = JSON.parse(readFileSync(candidate, 'utf8'));

        if (isJsonObject(parsed) && parsed.name === 'mepn') {
          return candidate;
        }
      } catch {
        return fallback;
      }
    }

    const next = dirname(current);

    if (next === current) {
      break;
    }

    current = next;
  }

  return fallback;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(
  value: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const field = value[key];

  return typeof field === 'string' && field.trim() ? field : fallback;
}
