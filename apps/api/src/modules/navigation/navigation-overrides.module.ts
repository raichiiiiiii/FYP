import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { NavigationOverridesController } from './navigation-overrides.controller';
import { NavigationOverridesService } from './navigation-overrides.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [NavigationOverridesController],
  providers: [NavigationOverridesService],
})
export class NavigationOverridesModule {}
