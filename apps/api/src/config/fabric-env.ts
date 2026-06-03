export type FabricMode = 'mock' | 'gateway';

export type FabricEnv = {
  enabled: boolean;
  mode: FabricMode;
  gatewayUrl: string;
  mspId: string;
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

const requiredGatewayVariables = [
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
  const enabled = readBoolean(source, 'FABRIC_ENABLED', false);
  const mode = readMode(source, enabled ? 'gateway' : 'mock');
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
    for (const variable of requiredGatewayVariables) {
      requireString(source, variable);
    }
  }

  return {
    enabled,
    mode,
    gatewayUrl: readOptionalString(source, 'FABRIC_GATEWAY_URL'),
    mspId: readOptionalString(source, 'FABRIC_MSP_ID'),
    channel: readOptionalString(source, 'FABRIC_CHANNEL'),
    chaincode: readOptionalString(source, 'FABRIC_CHAINCODE'),
    identityCertPath: readOptionalString(source, 'FABRIC_IDENTITY_CERT_PATH'),
    privateKeyPath: readOptionalString(source, 'FABRIC_PRIVATE_KEY_PATH'),
    tlsCertPath: readOptionalString(source, 'FABRIC_TLS_CERT_PATH'),
    peerEndpoint: readOptionalString(source, 'FABRIC_PEER_ENDPOINT'),
    gatewayHostAlias: readOptionalString(source, 'FABRIC_GATEWAY_HOST_ALIAS'),
    submitTimeoutMs,
    commitTimeoutMs,
  };
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

function requireString(source: EnvSource, name: string): string {
  const value = source[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when FABRIC_MODE=gateway`);
  }

  return value;
}

function readOptionalString(source: EnvSource, name: string): string {
  return source[name]?.trim() || '';
}
