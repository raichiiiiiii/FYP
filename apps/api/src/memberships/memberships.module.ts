import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../audit-events/audit-events.module';
import { DatabaseModule } from '../database/database.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
