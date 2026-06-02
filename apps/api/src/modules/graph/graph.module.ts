import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GraphController],
  providers: [GraphService],
})
export class GraphModule {}
