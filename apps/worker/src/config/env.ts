import { readFabricEnv, type FabricEnv } from './fabric-env';

export type WorkerEnv = {
  databaseUrl: string;
  pollIntervalMs: number;
  maxAttempts: number;
  enabled: boolean;
  fabric: FabricEnv;
};

function readNumber(name: string, fallback: number) {
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

function readString(name: string, fallback: string) {
  return process.env[name] || fallback;
}

export function readWorkerEnv(): WorkerEnv {
  return {
    databaseUrl: readString(
      'DATABASE_URL',
      'postgresql://mepn:mepn@localhost:5432/mepn',
    ),
    pollIntervalMs: readNumber('WORKER_POLL_INTERVAL_MS', 5000),
    maxAttempts: readNumber('WORKER_MAX_ATTEMPTS', 5),
    enabled: readString('WORKER_POLL_ENABLED', 'true') !== 'false',
    fabric: readFabricEnv(),
  };
}
