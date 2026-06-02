import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  listUsers() {
    return this.usersService.list();
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getById(id);
  }
}
