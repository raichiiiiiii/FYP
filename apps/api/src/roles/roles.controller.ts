import { Body, Controller, Get, Post } from '@nestjs/common';
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
  listRoles() {
    return this.rolesService.list();
  }
}
