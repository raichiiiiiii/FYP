import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule, EvidenceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
