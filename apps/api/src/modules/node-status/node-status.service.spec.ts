import { NodeStatusService } from './node-status.service';

describe('NodeStatusService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns self-hosted compatibility metadata without topology mutation support', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DEV_AUTH_ENABLED: 'true',
      FABRIC_CHANNEL: 'mepn-audit',
      FABRIC_CHAINCODE: 'audit-anchor',
      FABRIC_MSP_ID: 'Org1MSP',
      FABRIC_TOPOLOGY_AUTOMATION_ENABLED: 'false',
      LOCAL_PASSWORD_AUTH_ENABLED: 'true',
    };
    const service = new NodeStatusService(prismaMock() as never);
    const status = await service.getStatus();

    expect(status).toMatchObject({
      service: 'mepn-api',
      deployment: {
        model: 'self-hosted-organization-node',
        localSystemOfRecord: true,
        sharedCloudRequired: false,
      },
      compatibility: {
        apiVersion: 'v1',
        canonicalHashVersion: 'v1',
        reportSchemaVersion: 'v1',
        channelJoinPackageVersion: 'v1',
        fabricTopologyMode: 'operator_assisted',
        topologyMutationSupported: false,
      },
      database: {
        migrationStatus: 'available',
        appliedMigrationCount: 2,
        latestMigration: '20260607002000_fabric_consortium_governance',
      },
      fabric: {
        topologyMutationSupported: false,
        automationStatus: 'disabled',
        configuredChannel: 'configured',
        configuredChaincode: 'configured',
        configuredMspId: 'configured',
      },
    });
    expect(
      status.featureFlags.find((flag) => flag.id === 'local-seeded-auth'),
    ).toEqual(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('does not expose secret-like environment values', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      FABRIC_PRIVATE_KEY_PEM: '-----BEGIN PRIVATE KEY-----unsafe',
      AZURE_VM_SSH_KEY: 'private-key-placeholder',
      FABRIC_GATEWAY_URL: 'grpcs://gateway.example.test:7051',
    };
    const service = new NodeStatusService(prismaMock() as never);
    const status = await service.getStatus();

    expect(JSON.stringify(status)).not.toMatch(
      /BEGIN PRIVATE KEY|AZURE_VM_SSH_KEY|private-key-placeholder|gateway\.example/i,
    );
  });

  it('reports database migration status as unavailable if migrations cannot be queried', async () => {
    const service = new NodeStatusService({
      $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as never);

    await expect(service.getStatus()).resolves.toMatchObject({
      database: {
        migrationStatus: 'unavailable',
        appliedMigrationCount: 0,
        latestMigration: null,
      },
    });
  });
});

function prismaMock() {
  return {
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([{ count: 2n }])
      .mockResolvedValueOnce([
        {
          migration_name: '20260607002000_fabric_consortium_governance',
        },
      ]),
  };
}
