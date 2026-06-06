import { getAuthRuntimeConfig } from '../../../src/modules/auth/auth.config';

describe('auth runtime config', () => {
  it('enables dev auth outside production by default', () => {
    expect(getAuthRuntimeConfig({ NODE_ENV: 'test' }).devAuthEnabled).toBe(
      true,
    );
  });

  it('disables dev auth in production by default', () => {
    expect(
      getAuthRuntimeConfig({ NODE_ENV: 'production' }).devAuthEnabled,
    ).toBe(false);
  });

  it('allows explicit dev auth override for controlled UAT environments', () => {
    expect(
      getAuthRuntimeConfig({
        NODE_ENV: 'production',
        DEV_AUTH_ENABLED: 'true',
      }).devAuthEnabled,
    ).toBe(true);
  });

  it('parses OIDC and invite settings without requiring provider secrets', () => {
    const config = getAuthRuntimeConfig({
      NODE_ENV: 'production',
      OIDC_ENABLED: 'true',
      OIDC_TEST_MODE: 'true',
      OIDC_ISSUER_URL: 'https://issuer.example.test',
      OIDC_CLIENT_ID: 'client-id',
      OIDC_CALLBACK_URL: 'https://app.example.test/auth/callback',
      OIDC_SCOPES: 'openid email',
      OIDC_STATE_SECRET: 'state-secret',
      INVITE_TOKEN_TTL_SECONDS: '3600',
    });

    expect(config).toEqual(
      expect.objectContaining({
        oidcEnabled: true,
        oidcTestMode: true,
        oidcIssuer: 'https://issuer.example.test',
        oidcClientId: 'client-id',
        oidcCallbackUrl: 'https://app.example.test/auth/callback',
        oidcScopes: ['openid', 'email'],
        oidcStateSecret: 'state-secret',
        inviteTokenTtlSeconds: 3600,
      }),
    );
  });
});
