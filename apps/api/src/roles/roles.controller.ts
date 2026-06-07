import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateRoleInput } from './roles.service';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  createRole(@Body() body: CreateRoleInput) {
    return this.rolesService.create(body);
  }

  @Get()
  listRoles(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.rolesService.list({ organizationId, actorUserId });
  }
}
