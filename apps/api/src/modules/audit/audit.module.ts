import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditHashService } from './audit-hash.service';

@Module({
  imports: [DatabaseModule],
  providers: [AuditHashService],
  exports: [AuditHashService],
})
export class AuditModule {}
