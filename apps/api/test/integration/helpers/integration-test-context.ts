import { execSync } from 'node:child_process';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Client as PgClient } from 'pg';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { ObjectStorageService } from '../../../src/modules/evidence/object-storage/object-storage.service';
import { RedisQueueService } from '../../../src/modules/outbox/redis-queue.service';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://mepn:mepn@localhost:5432/mepn_test';

export const TEST_REDIS_URL =
  process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

let databasePrepared = false;

export type IntegrationAppContext = {
  app: INestApplication;
  prisma: PrismaService;
  redisQueue: RedisQueueService;
  objectStorage: ObjectStorageService;
};

export function setIntegrationEnv() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.REDIS_URL = TEST_REDIS_URL;
  process.env.MINIO_ENDPOINT =
    process.env.TEST_MINIO_ENDPOINT || 'http://localhost:9000';
  process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'mepn';
  process.env.MINIO_SECRET_KEY =
    process.env.MINIO_SECRET_KEY || 'mepn_password';
  process.env.MINIO_BUCKET = process.env.MINIO_BUCKET || 'mepn-evidence-test';
}

export async function prepareIntegrationDatabase() {
  if (databasePrepared) {
    return;
  }

  setIntegrationEnv();
  await recreateDatabase(TEST_DATABASE_URL);
  execSync(
    'corepack pnpm exec prisma migrate deploy --schema prisma/schema.prisma',
    {
      cwd: path.resolve(__dirname, '../../..'),
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
      stdio: 'pipe',
    },
  );
  databasePrepared = true;
}

export async function resetIntegrationDatabase() {
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

export async function createIntegrationApp(): Promise<IntegrationAppContext> {
  await prepareIntegrationDatabase();
  await resetIntegrationDatabase();
  setIntegrationEnv();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    redisQueue: app.get(RedisQueueService),
    objectStorage: app.get(ObjectStorageService),
  };
}

export async function closeIntegrationApp(context: IntegrationAppContext) {
  await context.app.close();
}

export function createPrismaClient() {
  setIntegrationEnv();
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: TEST_DATABASE_URL,
    }),
  });
}

export async function recreateDatabase(databaseUrl: string) {
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
