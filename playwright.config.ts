import { defineConfig, devices } from '@playwright/test';

const apiPort = Number(process.env.E2E_API_PORT ?? 3100);
const webPort = Number(process.env.E2E_WEB_PORT ?? 5174);
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  'postgresql://mepn:mepn@localhost:5432/mepn_e2e';
const apiBaseUrl =
  process.env.E2E_API_BASE_URL ?? `http://127.0.0.1:${apiPort}/api/v1`;
const webBaseUrl =
  process.env.E2E_WEB_BASE_URL ?? `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: webBaseUrl,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'corepack pnpm --dir apps/api start',
      url: `${apiBaseUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        API_PORT: String(apiPort),
        DATABASE_URL: databaseUrl,
        MINIO_ACCESS_KEY: 'mepn',
        MINIO_BUCKET: 'mepn-evidence-e2e',
        MINIO_ENDPOINT: 'http://localhost:9000',
        MINIO_SECRET_KEY: 'mepn_password',
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6379',
        WEB_ORIGIN: webBaseUrl,
      },
    },
    {
      command: `corepack pnpm --dir apps/web dev --host 127.0.0.1 --port ${webPort}`,
      url: webBaseUrl,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: apiBaseUrl,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
