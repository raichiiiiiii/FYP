import { execFileSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

if (process.env.MEPN_MULTI_NODE_UAT === 'true') {
  console.log(
    'MEPN_MULTI_NODE_UAT=true; skipping single-node E2E database preparation.',
  );
  process.exit(0);
}

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  'postgresql://mepn:mepn@localhost:5432/mepn_e2e';
const adminDatabaseUrl =
  process.env.E2E_ADMIN_DATABASE_URL ??
  'postgresql://mepn:mepn@localhost:5432/postgres';

function executable(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function run(command, args, env = {}) {
  const options = {
    cwd: rootDir,
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  };

  if (process.platform === 'win32') {
    execFileSync(
      'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].map(quoteCmdPart).join(' ')],
      options,
    );
    return;
  }

  execFileSync(command, args, options);
}

function quoteCmdPart(value) {
  if (/^[A-Za-z0-9_./:=\\-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function databaseNameFromUrl(connectionUrl) {
  const parsed = new URL(connectionUrl);
  const name = parsed.pathname.replace(/^\//, '');

  if (!name) {
    throw new Error('E2E_DATABASE_URL must include a database name');
  }

  return decodeURIComponent(name);
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function isTcpPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: '127.0.0.1',
      port,
      timeout: 1_000,
    });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function localInfrastructureAlreadyAvailable() {
  const requiredPorts = [5432, 6379, 9000];
  const results = await Promise.all(
    requiredPorts.map((port) => isTcpPortOpen(port)),
  );

  return results.every(Boolean);
}

async function waitForPostgres() {
  const attempts = 40;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = new Client({ connectionString: adminDatabaseUrl });

    try {
      await client.connect();
      await client.query('select 1');
      await client.end();
      return;
    } catch (error) {
      await client.end().catch(() => undefined);

      if (attempt === attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}

async function prepareDatabase() {
  const databaseName = databaseNameFromUrl(databaseUrl);
  const client = new Client({ connectionString: adminDatabaseUrl });

  await client.connect();
  await client.query(
    'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
    [databaseName],
  );
  await client.query(`drop database if exists ${quoteIdentifier(databaseName)}`);
  await client.query(`create database ${quoteIdentifier(databaseName)}`);
  await client.end();

  run(
    executable('corepack'),
    [
      'pnpm',
      '--dir',
      'apps/api',
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      DATABASE_URL: databaseUrl,
    },
  );
}

if (!(await localInfrastructureAlreadyAvailable())) {
  run('docker', ['compose', '-f', 'infra/docker-compose.yml', 'up', '-d']);
}

await waitForPostgres();
await prepareDatabase();
