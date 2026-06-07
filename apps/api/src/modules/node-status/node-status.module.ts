import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NodeStatusController } from './node-status.controller';
import { NodeStatusService } from './node-status.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NodeStatusController],
  providers: [NodeStatusService],
})
export class NodeStatusModule {}
