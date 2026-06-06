import { readFabricEnv, type FabricEnv } from './fabric-env';

export type ApiEnv = {
  apiPort: number;
  databaseUrl: string;
  redisUrl: string;
  webOrigin: string;
  webOrigins: string[];
  nodeEnv: string;
  fabric: FabricEnv;
};

function readNumber(
  source: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = source[name];

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }

  return value;
}

function readString(
  source: NodeJS.ProcessEnv,
  name: string,
  fallback: string,
): string {
  return source[name] || fallback;
}

function readWebOrigins(source: NodeJS.ProcessEnv, nodeEnv: string) {
  const configuredOrigins = [source.WEB_ORIGINS, source.WEB_ORIGIN]
    .filter(Boolean)
    .flatMap((value) => value?.split(',') ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return [...new Set(configuredOrigins)];
  }

  if (nodeEnv !== 'production') {
    return [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
    ];
  }

  return ['http://localhost:5173'];
}

export function readApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const nodeEnv = readString(source, 'NODE_ENV', 'development');
  const webOrigins = readWebOrigins(source, nodeEnv);

  return {
    apiPort: readNumber(source, 'API_PORT', 3000),
    databaseUrl: readString(
      source,
      'DATABASE_URL',
      'postgresql://mepn:mepn@localhost:5432/mepn',
    ),
    redisUrl: readString(source, 'REDIS_URL', 'redis://localhost:6379'),
    webOrigin: webOrigins[0],
    webOrigins,
    nodeEnv,
    fabric: readFabricEnv(source),
  };
}
