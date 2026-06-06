import { readApiEnv } from './env';

describe('readApiEnv', () => {
  it('allows common Vite localhost fallback origins in development', () => {
    expect(readApiEnv({}).webOrigins).toEqual([
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
    ]);
  });

  it('uses configured WEB_ORIGIN without adding development fallbacks', () => {
    expect(
      readApiEnv({
        WEB_ORIGIN: 'https://mepn.example',
      }).webOrigins,
    ).toEqual(['https://mepn.example']);
  });

  it('supports a comma-separated WEB_ORIGINS allowlist', () => {
    expect(
      readApiEnv({
        WEB_ORIGINS:
          'https://mepn.example, https://review.mepn.example, https://mepn.example',
      }).webOrigins,
    ).toEqual(['https://mepn.example', 'https://review.mepn.example']);
  });

  it('keeps production CORS explicit when no origin is configured', () => {
    expect(readApiEnv({ NODE_ENV: 'production' }).webOrigins).toEqual([
      'http://localhost:5173',
    ]);
  });
});
