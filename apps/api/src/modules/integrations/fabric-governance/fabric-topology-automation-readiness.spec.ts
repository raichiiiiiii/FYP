import { getFabricTopologyAutomationReadiness } from './fabric-topology-automation-readiness';

describe('Fabric topology automation readiness', () => {
  it('is disabled by default', () => {
    const readiness = getFabricTopologyAutomationReadiness({});

    expect(readiness.enabled).toBe(false);
    expect(readiness.status).toBe('disabled');
    expect(readiness.executionMode).toBe('not_enabled');
    expect(readiness.missingRequirementIds).toContain(
      'automation-adr-approved',
    );
    expect(readiness.limitations).toContain(
      'Direct Fabric topology execution is disabled by default.',
    );
  });

  it('reports blocked when enabled without required decisions and admin material', () => {
    const readiness = getFabricTopologyAutomationReadiness({
      FABRIC_TOPOLOGY_AUTOMATION_ENABLED: 'true',
      FABRIC_OPERATOR_AGENT_URL: 'https://operator-agent.example.test',
    });

    expect(readiness.status).toBe('blocked');
    expect(readiness.executionMode).toBe('operator_agent');
    expect(readiness.missingRequirementIds).toEqual(
      expect.arrayContaining([
        'automation-adr-approved',
        'secret-custody-approved',
        'admin-cert-path',
        'admin-key-path',
        'orderer-admin-endpoint',
      ]),
    );
    expect(readiness.nextActions.join(' ')).toContain(
      'Resolve missing requirements',
    );
  });

  it('reports ready only when all gated requirements are configured', () => {
    const readiness = getFabricTopologyAutomationReadiness({
      FABRIC_TOPOLOGY_AUTOMATION_ENABLED: 'true',
      FABRIC_TOPOLOGY_AUTOMATION_ADR_APPROVED: 'true',
      FABRIC_TOPOLOGY_SECRET_CUSTODY_APPROVED: 'true',
      FABRIC_TOPOLOGY_RECOVERY_POLICY_APPROVED: 'true',
      FABRIC_OPERATOR_AGENT_URL: 'https://operator-agent.example.test',
      FABRIC_CHANNEL_ADMIN_MSP_ID: 'Org1MSP',
      FABRIC_CHANNEL_ADMIN_CERT_PATH: '/run/secrets/fabric-admin/cert.pem',
      FABRIC_CHANNEL_ADMIN_KEY_PATH: '/run/secrets/fabric-admin/key.pem',
      FABRIC_ORDERER_ADMIN_ENDPOINT: 'orderer.example.com:7053',
      FABRIC_ORDERER_ADMIN_TLS_CERT_PATH:
        '/run/secrets/fabric-admin/orderer-client.crt',
      FABRIC_ORDERER_ADMIN_TLS_KEY_PATH:
        '/run/secrets/fabric-admin/orderer-client.key',
      FABRIC_CONFIGTX_PROFILE: 'MepnApplicationChannel',
      FABRIC_CONFIGTX_PATH: '/run/secrets/fabric-admin/configtx.yaml',
    });

    expect(readiness.status).toBe('ready');
    expect(readiness.missingRequirementIds).toEqual([]);
    expect(readiness.limitations.join(' ')).toContain(
      'gated operator-agent integration test',
    );
  });
});
