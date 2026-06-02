import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { DevLoginInput } from './auth.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
