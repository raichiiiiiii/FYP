import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { GraphService } from './graph.service';

type SaveGraphViewBody = {
  organizationId?: string;
  actorUserId?: string;
  name?: string;
  filters?: unknown;
  layout?: unknown;
  visibility?: string;
};

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Post('views')
  createSavedView(@Body() body: SaveGraphViewBody) {
    return this.graphService.createSavedView(body);
  }

  @Get('views')
  listSavedViews(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.graphService.listSavedViews({ organizationId, actorUserId });
  }

  @Patch('views/:viewId')
  updateSavedView(
    @Param('viewId') viewId: string,
    @Body() body: SaveGraphViewBody,
  ) {
    return this.graphService.updateSavedView({ ...body, viewId });
  }

  @Delete('views/:viewId')
  deleteSavedView(
    @Param('viewId') viewId: string,
    @Body() body: Pick<SaveGraphViewBody, 'organizationId' | 'actorUserId'>,
  ) {
    return this.graphService.deleteSavedView({ ...body, viewId });
  }

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
