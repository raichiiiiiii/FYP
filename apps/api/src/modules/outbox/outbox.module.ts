import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OutboxService } from './outbox.service';
import { RedisQueueService } from './redis-queue.service';

@Module({
  imports: [DatabaseModule],
  providers: [OutboxService, RedisQueueService],
  exports: [OutboxService, RedisQueueService],
})
export class OutboxModule {}
