import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { getAuthRuntimeConfig } from './auth.config';
import { AuthService } from './auth.service';

export type OidcCallbackInput = {
  state: string;
  nonce: string;
  idToken?: string;
  organizationId?: string;
};

@Injectable()
export class OidcStrategy {
  constructor(
    private readonly authService: AuthService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  get enabled() {
    return getAuthRuntimeConfig().oidcEnabled;
  }

  start(returnTo?: string) {
    const config = requireOidcConfig();
    const nonce = randomBytes(24).toString('base64url');
    const state = signState(
      {
        nonce,
        returnTo: returnTo || '/dashboard',
        issuedAt: Date.now(),
      },
      config.oidcStateSecret,
    );
    const authorizationUrl = new URL(`${config.oidcIssuer}/authorize`);

    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', config.oidcClientId);
    authorizationUrl.searchParams.set('redirect_uri', config.oidcCallbackUrl);
    authorizationUrl.searchParams.set('scope', config.oidcScopes.join(' '));
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('nonce', nonce);

    return {
      mode: 'oidc',
      authorizationUrl: authorizationUrl.toString(),
      state,
      nonce,
      testMode: config.oidcTestMode,
    };
  }

  async callback(input: OidcCallbackInput) {
    const config = requireOidcConfig();
    const state = verifyState(input.state, config.oidcStateSecret);

    if (state.nonce !== input.nonce) {
      await this.auditOidcFailure('nonce_mismatch');
      throw new UnauthorizedException('OIDC nonce mismatch');
    }

    if (!config.oidcTestMode) {
      await this.auditOidcFailure('provider_adapter_not_configured');
      throw new BadRequestException(
        'OIDC provider token exchange is not configured for this deployment',
      );
    }

    const claims = parseUnsignedTestIdToken(input.idToken);
    validateClaims(claims, {
      issuer: config.oidcIssuer,
      audience: config.oidcClientId,
      nonce: input.nonce,
    });

    const session = await this.authService.oidcLogin({
      email: claims.email,
      organizationId: input.organizationId,
    });

    await this.auditEvents.create({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      eventType: 'OIDC_LOGIN_SUCCEEDED',
      entityType: 'User',
      entityId: session.userId,
      metadata: {
        issuer: claims.iss,
        audience: claims.aud,
        email: claims.email,
        testMode: true,
      },
    });

    return session;
  }

  private auditOidcFailure(reason: string) {
    return this.auditEvents.create({
      eventType: 'OIDC_LOGIN_FAILED',
      entityType: 'AuthAttempt',
      entityId: reason,
      metadata: {
        reason,
      },
    });
  }
}

type OidcState = {
  nonce: string;
  returnTo: string;
  issuedAt: number;
};

type OidcClaims = {
  iss: string;
  aud: string | string[];
  exp: number;
  nonce: string;
  email: string;
};

function requireOidcConfig() {
  const config = getAuthRuntimeConfig();

  if (!config.oidcEnabled) {
    throw new BadRequestException('OIDC is not enabled');
  }

  if (!config.oidcIssuer || !config.oidcClientId || !config.oidcCallbackUrl) {
    throw new BadRequestException(
      'OIDC issuer, client id, and callback URL are required',
    );
  }

  return {
    ...config,
    oidcIssuer: config.oidcIssuer,
    oidcClientId: config.oidcClientId,
    oidcCallbackUrl: config.oidcCallbackUrl,
  };
}

function signState(state: OidcState, secret: string) {
  const encoded = Buffer.from(JSON.stringify(state)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('hex');

  return `${encoded}.${signature}`;
}

function verifyState(value: string | undefined, secret: string): OidcState {
  if (!value) {
    throw new BadRequestException('OIDC state is required');
  }

  const [encoded, signature] = value.split('.');

  if (!encoded || !signature) {
    throw new UnauthorizedException('OIDC state is invalid');
  }

  const expected = createHmac('sha256', secret).update(encoded).digest('hex');

  const receivedSignature = Buffer.from(signature);
  const expectedSignature = Buffer.from(expected);

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    throw new UnauthorizedException('OIDC state is invalid');
  }

  return JSON.parse(Buffer.from(encoded, 'base64url').toString()) as OidcState;
}

function parseUnsignedTestIdToken(idToken: string | undefined): OidcClaims {
  if (!idToken) {
    throw new BadRequestException('idToken is required in OIDC test mode');
  }

  const [, payload] = idToken.split('.');

  if (!payload) {
    throw new BadRequestException('idToken payload is invalid');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as OidcClaims;
}

function validateClaims(
  claims: OidcClaims,
  expected: { issuer: string; audience: string; nonce: string },
) {
  if (claims.iss !== expected.issuer) {
    throw new UnauthorizedException('OIDC issuer mismatch');
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

  if (!audiences.includes(expected.audience)) {
    throw new UnauthorizedException('OIDC audience mismatch');
  }

  if (claims.exp * 1000 <= Date.now()) {
    throw new UnauthorizedException('OIDC token is expired');
  }

  if (claims.nonce !== expected.nonce) {
    throw new UnauthorizedException('OIDC token nonce mismatch');
  }

  if (!claims.email?.trim()) {
    throw new UnauthorizedException('OIDC email claim is required');
  }
}
