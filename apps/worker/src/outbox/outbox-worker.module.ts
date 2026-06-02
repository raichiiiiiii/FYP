import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MockIntegrationAdapters } from '../integrations/mock-adapters';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  imports: [DatabaseModule],
  providers: [MockIntegrationAdapters, OutboxWorkerService],
  exports: [OutboxWorkerService],
})
export class OutboxWorkerModule {}
