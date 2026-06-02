import { Controller, Get, Param, Query } from '@nestjs/common';
import { GraphService } from './graph.service';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('projects/:projectId')
  getProjectGraph(
    @Param('projectId') projectId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.graphService.getProjectGraph({
      organizationId,
      actorUserId,
      projectId,
    });
  }
}
