import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OutboxWorkerModule } from './outbox/outbox-worker.module';

@Module({
  imports: [OutboxWorkerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
