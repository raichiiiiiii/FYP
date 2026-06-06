import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { DevLoginInput } from './auth.service';
import { AuthService } from './auth.service';
import type {
  AcceptInvitationInput,
  CreateInvitationInput,
  RevokeInvitationInput,
} from './invitations/invitations.service';
import { InvitationsService } from './invitations/invitations.service';
import type { OidcCallbackInput } from './oidc.strategy';
import { OidcStrategy } from './oidc.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitationsService: InvitationsService,
    private readonly oidcStrategy: OidcStrategy,
  ) {}

  @Post('dev-login')
  devLogin(@Body() body: DevLoginInput) {
    return this.authService.devLogin(body);
  }

  @Get('session')
  getSession(
    @Query('userId') userId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.authService.getSession({ userId, organizationId });
  }

  @Get('oidc/start')
  startOidc(@Query('returnTo') returnTo?: string) {
    return this.oidcStrategy.start(returnTo);
  }

  @Post('oidc/callback')
  oidcCallback(@Body() body: OidcCallbackInput) {
    return this.oidcStrategy.callback(body);
  }

  @Post('invitations')
  createInvitation(@Body() body: CreateInvitationInput) {
    return this.invitationsService.create(body);
  }

  @Get('invitations')
  listInvitations(
    @Query('organizationId') organizationId: string,
    @Query('actorUserId') actorUserId: string,
  ) {
    return this.invitationsService.list({ organizationId, actorUserId });
  }

  @Get('invitations/accept')
  getInvitationAcceptance(@Query('token') token: string) {
    return this.invitationsService.getAcceptanceByToken(token);
  }

  @Post('invitations/accept')
  acceptInvitation(@Body() body: AcceptInvitationInput) {
    return this.invitationsService.accept(body);
  }

  @Post('invitations/:id/revoke')
  revokeInvitation(
    @Param('id') id: string,
    @Body() body: RevokeInvitationInput,
  ) {
    return this.invitationsService.revoke(id, body);
  }
}
