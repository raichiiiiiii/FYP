import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevAuthStrategy } from './dev-auth.strategy';
import { OidcStrategy } from './oidc.strategy';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, DevAuthStrategy, OidcStrategy],
  exports: [AuthService],
})
export class AuthModule {}
