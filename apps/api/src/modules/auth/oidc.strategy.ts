import { Injectable } from '@nestjs/common';

@Injectable()
export class OidcStrategy {
  readonly enabled = process.env.OIDC_ENABLED === 'true';
}
