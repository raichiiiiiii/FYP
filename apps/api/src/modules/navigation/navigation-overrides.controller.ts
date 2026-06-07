import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type {
  UpdateNavigationOverridesInput,
  UserNavigationOverrideLookup,
} from './navigation-overrides.service';
import { NavigationOverridesService } from './navigation-overrides.service';

@Controller('admin/users/:userId/navigation')
export class NavigationOverridesController {
  constructor(
    private readonly navigationOverrides: NavigationOverridesService,
  ) {}

  @Get()
  getOverrides(
    @Param('userId') userId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.navigationOverrides.getForUser({
      organizationId,
      actorUserId,
      userId,
    });
  }

  @Patch()
  updateOverrides(
    @Param('userId') userId: string,
    @Body() body: Omit<UpdateNavigationOverridesInput, 'userId'>,
  ) {
    return this.navigationOverrides.updateForUser({
      ...body,
      userId,
    });
  }
}

export type NavigationOverrideRouteParams = UserNavigationOverrideLookup;
