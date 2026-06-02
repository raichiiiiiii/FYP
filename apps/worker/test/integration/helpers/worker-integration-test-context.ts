import { execSync } from 'node:child_process';
import path from 'node:path';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Client as PgClient } from 'pg';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { OutboxWorkerService } from '../../../src/outbox/outbox-worker.service';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://mepn:mepn@localhost:5432/mepn_test';

let databasePrepared = false;

export type WorkerIntegrationContext = {
  moduleRef: TestingModule;
  prisma: PrismaService;
  worker: OutboxWorkerService;
};

export function setWorkerIntegrationEnv() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.WORKER_POLL_ENABLED = 'false';
  process.env.WORKER_MAX_ATTEMPTS = process.env.WORKER_MAX_ATTEMPTS || '3';
}

export async function prepareWorkerIntegrationDatabase() {
  if (databasePrepared) {
    return;
  }

  setWorkerIntegrationEnv();
  await recreateDatabase(TEST_DATABASE_URL);
  execSync(
    'corepack pnpm exec prisma migrate deploy --schema prisma/schema.prisma',
    {
      cwd: path.resolve(__dirname, '../../../../api'),
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
      stdio: 'pipe',
    },
  );
  databasePrepared = true;
}

export async function resetWorkerIntegrationDatabase() {
  const client = new PgClient({ connectionString: TEST_DATABASE_URL });
  await client.connect();

  try {
    const tables = await client.query<{ tablename: string }>(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );

    if (tables.rows.length) {
      const tableNames = tables.rows
        .map((row) => `public.${quoteIdentifier(row.tablename)}`)
        .join(', ');
      await client.query(
        `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
      );
    }
  } finally {
    await client.end();
  }
}

export async function createWorkerIntegrationContext() {
  await prepareWorkerIntegrationDatabase();
  await resetWorkerIntegrationDatabase();
  setWorkerIntegrationEnv();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  await moduleRef.init();

  return {
    moduleRef,
    prisma: moduleRef.get(PrismaService),
    worker: moduleRef.get(OutboxWorkerService),
  };
}

export async function closeWorkerIntegrationContext(
  context: WorkerIntegrationContext,
) {
  await context.moduleRef.close();
}

async function recreateDatabase(databaseUrl: string) {
  const target = new URL(databaseUrl);
  const databaseName = decodeURIComponent(target.pathname.slice(1));

  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error(`Unsafe test database name: ${databaseName}`);
  }

  target.pathname = '/postgres';
  const client = new PgClient({ connectionString: target.toString() });
  await client.connect();

  try {
    await client.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
    );
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
