import { Injectable } from '@nestjs/common';
import { getAuthRuntimeConfig } from './auth.config';

@Injectable()
export class OidcStrategy {
  readonly enabled = getAuthRuntimeConfig().oidcEnabled;
}
