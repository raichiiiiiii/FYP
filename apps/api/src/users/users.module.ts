import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../audit-events/audit-events.module';
import { DatabaseModule } from '../database/database.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
