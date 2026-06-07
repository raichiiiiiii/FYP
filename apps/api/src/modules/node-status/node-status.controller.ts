import { Controller, Get, HttpCode } from '@nestjs/common';
import { NodeStatusResponseDto } from './node-status.dto';
import { NodeStatusService } from './node-status.service';

@Controller('node')
export class NodeStatusController {
  constructor(private readonly nodeStatus: NodeStatusService) {}

  @Get('status')
  @HttpCode(200)
  getStatus(): Promise<NodeStatusResponseDto> {
    return this.nodeStatus.getStatus();
  }
}
