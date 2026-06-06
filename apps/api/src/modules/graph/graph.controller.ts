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
    @Query('nodeType') nodeType?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('includeFinance') includeFinance?: string,
    @Query('includeAnchors') includeAnchors?: string,
    @Query('status') status?: string,
  ) {
    return this.graphService.getProjectGraph({
      organizationId,
      actorUserId,
      projectId,
      filters: {
        nodeType,
        riskLevel,
        includeFinance,
        includeAnchors,
        status,
      },
    });
  }
}
