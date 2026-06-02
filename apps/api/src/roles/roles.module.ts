import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../audit-events/audit-events.module';
import { DatabaseModule } from '../database/database.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
