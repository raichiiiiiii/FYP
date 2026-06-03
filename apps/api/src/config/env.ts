import { readFabricEnv, type FabricEnv } from './fabric-env';

export type ApiEnv = {
  apiPort: number;
  databaseUrl: string;
  redisUrl: string;
  webOrigin: string;
  nodeEnv: string;
  fabric: FabricEnv;
};

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }

  return value;
}

function readString(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export function readApiEnv(): ApiEnv {
  return {
    apiPort: readNumber('API_PORT', 3000),
    databaseUrl: readString(
      'DATABASE_URL',
      'postgresql://mepn:mepn@localhost:5432/mepn',
    ),
    redisUrl: readString('REDIS_URL', 'redis://localhost:6379'),
    webOrigin: readString('WEB_ORIGIN', 'http://localhost:5173'),
    nodeEnv: readString('NODE_ENV', 'development'),
    fabric: readFabricEnv(),
  };
}
