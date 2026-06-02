import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../audit-events/audit-events.module';
import { DatabaseModule } from '../database/database.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
