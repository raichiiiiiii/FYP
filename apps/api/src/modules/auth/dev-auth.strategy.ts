import { Injectable } from '@nestjs/common';

@Injectable()
export class DevAuthStrategy {
  readonly mode = 'dev';
}
