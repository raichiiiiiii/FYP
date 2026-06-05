export type FabricMode = 'mock' | 'gateway';

export type FabricEnv = {
  enabled: boolean;
  mode: FabricMode;
  gatewayUrl: string;
  mspId: string;
  identity: string;
  channel: string;
  chaincode: string;
  identityCertPath: string;
  privateKeyPath: string;
  tlsCertPath: string;
  peerEndpoint: string;
  gatewayHostAlias: string;
  submitTimeoutMs: number;
  commitTimeoutMs: number;
};

type EnvSource = Record<string, string | undefined>;

const defaultSecretRoot = '/run/secrets/fabric';

export const fabricGatewayRequiredVariables = [
  'FABRIC_GATEWAY_URL',
  'FABRIC_MSP_ID',
  'FABRIC_CHANNEL',
  'FABRIC_CHAINCODE',
  'FABRIC_IDENTITY_CERT_PATH',
  'FABRIC_PRIVATE_KEY_PATH',
  'FABRIC_TLS_CERT_PATH',
  'FABRIC_PEER_ENDPOINT',
  'FABRIC_GATEWAY_HOST_ALIAS',
] as const;

export function readFabricEnv(source: EnvSource = process.env): FabricEnv {
  const anchorAdapter = readOptionalString(
    source,
    'BLOCKCHAIN_ANCHOR_ADAPTER',
  ).toLowerCase();

  if (anchorAdapter && anchorAdapter !== 'fabric' && anchorAdapter !== 'mock') {
    throw new Error(
      'BLOCKCHAIN_ANCHOR_ADAPTER must be either "fabric" or "mock"',
    );
  }

  const adapterRequiresGateway = anchorAdapter === 'fabric';
  const enabled = readBoolean(source, 'FABRIC_ENABLED', adapterRequiresGateway);
  const mode = readMode(
    source,
    adapterRequiresGateway || enabled ? 'gateway' : 'mock',
  );

  if (adapterRequiresGateway && mode !== 'gateway') {
    throw new Error(
      'BLOCKCHAIN_ANCHOR_ADAPTER=fabric requires FABRIC_MODE=gateway',
    );
  }

  const submitTimeoutMs = readPositiveNumber(
    source,
    'FABRIC_SUBMIT_TIMEOUT_MS',
    30_000,
  );
  const commitTimeoutMs = readPositiveNumber(
    source,
    'FABRIC_COMMIT_TIMEOUT_MS',
    30_000,
  );

  if (mode === 'gateway') {
    const missing = missingFabricGatewayConfig(source);

    if (missing.length > 0) {
      throw new Error(`${missing[0]} is required when FABRIC_MODE=gateway`);
    }
  }

  const secretPathRoot = mode === 'gateway' ? defaultSecretRoot : '';

  return {
    enabled,
    mode,
    gatewayUrl: readFirst(source, ['FABRIC_GATEWAY_URL']),
    mspId: readFirst(source, ['FABRIC_MSP_ID']),
    identity: readFirst(source, ['FABRIC_IDENTITY']),
    channel: readFirst(source, ['FABRIC_CHANNEL', 'FABRIC_CHANNEL_NAME']),
    chaincode: readFirst(source, ['FABRIC_CHAINCODE', 'FABRIC_CHAINCODE_NAME']),
    identityCertPath: readFirst(
      source,
      ['FABRIC_IDENTITY_CERT_PATH'],
      secretPathRoot ? `${secretPathRoot}/identity/cert.pem` : '',
    ),
    privateKeyPath: readFirst(
      source,
      ['FABRIC_PRIVATE_KEY_PATH'],
      secretPathRoot ? `${secretPathRoot}/identity/key.pem` : '',
    ),
    tlsCertPath: readFirst(
      source,
      ['FABRIC_TLS_CERT_PATH'],
      secretPathRoot ? `${secretPathRoot}/tls/ca.crt` : '',
    ),
    peerEndpoint: readFirst(source, ['FABRIC_PEER_ENDPOINT']),
    gatewayHostAlias: readFirst(source, ['FABRIC_GATEWAY_HOST_ALIAS']),
    submitTimeoutMs,
    commitTimeoutMs,
  };
}

export function missingFabricGatewayConfig(
  source: EnvSource = process.env,
): string[] {
  const normalized = {
    FABRIC_GATEWAY_URL: readFirst(source, ['FABRIC_GATEWAY_URL']),
    FABRIC_MSP_ID: readFirst(source, ['FABRIC_MSP_ID']),
    FABRIC_CHANNEL: readFirst(source, [
      'FABRIC_CHANNEL',
      'FABRIC_CHANNEL_NAME',
    ]),
    FABRIC_CHAINCODE: readFirst(source, [
      'FABRIC_CHAINCODE',
      'FABRIC_CHAINCODE_NAME',
    ]),
    FABRIC_IDENTITY_CERT_PATH: readFirst(
      source,
      ['FABRIC_IDENTITY_CERT_PATH'],
      `${defaultSecretRoot}/identity/cert.pem`,
    ),
    FABRIC_PRIVATE_KEY_PATH: readFirst(
      source,
      ['FABRIC_PRIVATE_KEY_PATH'],
      `${defaultSecretRoot}/identity/key.pem`,
    ),
    FABRIC_TLS_CERT_PATH: readFirst(
      source,
      ['FABRIC_TLS_CERT_PATH'],
      `${defaultSecretRoot}/tls/ca.crt`,
    ),
    FABRIC_PEER_ENDPOINT: readFirst(source, ['FABRIC_PEER_ENDPOINT']),
    FABRIC_GATEWAY_HOST_ALIAS: readFirst(source, ['FABRIC_GATEWAY_HOST_ALIAS']),
  };

  return fabricGatewayRequiredVariables.filter(
    (variable) => !normalized[variable],
  );
}

function readMode(source: EnvSource, fallback: FabricMode): FabricMode {
  const raw = source.FABRIC_MODE?.trim() || fallback;

  if (raw === 'mock' || raw === 'gateway') {
    return raw;
  }

  throw new Error('FABRIC_MODE must be either "mock" or "gateway"');
}

function readBoolean(
  source: EnvSource,
  name: string,
  fallback: boolean,
): boolean {
  const raw = source[name]?.trim().toLowerCase();

  if (!raw) {
    return fallback;
  }

  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  throw new Error(`${name} must be either "true" or "false"`);
}

function readPositiveNumber(
  source: EnvSource,
  name: string,
  fallback: number,
): number {
  const raw = source[name]?.trim();

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return value;
}

function readOptionalString(source: EnvSource, name: string): string {
  return source[name]?.trim() || '';
}

function readFirst(source: EnvSource, names: string[], fallback = ''): string {
  for (const name of names) {
    const value = source[name]?.trim();

    if (value) {
      return value;
    }
  }

  return fallback;
}
