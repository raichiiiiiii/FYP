import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { CreateUserInput } from './users.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createUser(@Body() body: CreateUserInput) {
    return this.usersService.create(body);
  }

  @Get()
  listUsers(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.usersService.list({ organizationId, actorUserId });
  }

  @Get(':id')
  getUser(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.usersService.getById(id, { organizationId, actorUserId });
  }
}
