import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import type { UpdateAccountProfileInput } from './account.service';
import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  getProfile(
    @Query('organizationId') organizationId: string,
    @Query('actorUserId') actorUserId: string,
  ) {
    return this.accountService.getProfile({ organizationId, actorUserId });
  }

  @Patch('profile')
  updateProfile(@Body() body: UpdateAccountProfileInput) {
    return this.accountService.updateProfile(body);
  }
}
