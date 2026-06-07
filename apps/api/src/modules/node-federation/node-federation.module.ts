import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { NodeFederationController } from './node-federation.controller';
import { NodeFederationService } from './node-federation.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule],
  controllers: [NodeFederationController],
  providers: [NodeFederationService],
  exports: [NodeFederationService],
})
export class NodeFederationModule {}
