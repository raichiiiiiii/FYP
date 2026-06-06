import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [InboxController],
  providers: [InboxService],
})
export class InboxModule {}
