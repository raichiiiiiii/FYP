import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevAuthStrategy } from './dev-auth.strategy';
import { InvitationsService } from './invitations/invitations.service';
import { OidcStrategy } from './oidc.strategy';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [AuthController],
  providers: [AuthService, DevAuthStrategy, OidcStrategy, InvitationsService],
  exports: [AuthService],
})
export class AuthModule {}
