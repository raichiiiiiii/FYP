export type AuthRuntimeConfig = {
  devAuthEnabled: boolean;
  oidcEnabled: boolean;
  oidcTestMode: boolean;
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcCallbackUrl?: string;
  oidcScopes: string[];
  oidcStateSecret: string;
  inviteTokenTtlSeconds: number;
};

const defaultInviteTokenTtlSeconds = 7 * 24 * 60 * 60;

export function getAuthRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthRuntimeConfig {
  return {
    devAuthEnabled: readBoolean(
      env.DEV_AUTH_ENABLED,
      env.NODE_ENV !== 'production',
    ),
    oidcEnabled: readBoolean(env.OIDC_ENABLED, false),
    oidcTestMode: readBoolean(env.OIDC_TEST_MODE, false),
    oidcIssuer: env.OIDC_ISSUER || env.OIDC_ISSUER_URL || undefined,
    oidcClientId: env.OIDC_CLIENT_ID || undefined,
    oidcCallbackUrl: env.OIDC_CALLBACK_URL || undefined,
    oidcScopes: parseScopes(env.OIDC_SCOPES),
    oidcStateSecret:
      env.OIDC_STATE_SECRET ||
      env.SESSION_SECRET ||
      env.JWT_SECRET ||
      'mepn-dev-oidc-state',
    inviteTokenTtlSeconds: readPositiveInteger(
      env.INVITE_TOKEN_TTL_SECONDS ?? env.INVITE_TOKEN_TTL,
      defaultInviteTokenTtlSeconds,
    ),
  };
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseScopes(value: string | undefined) {
  const scopes = value?.trim() ? value.trim().split(/\s+/) : [];

  return scopes.length ? scopes : ['openid', 'email', 'profile'];
}
