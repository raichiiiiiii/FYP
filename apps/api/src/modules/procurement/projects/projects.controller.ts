import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CreateProjectInput } from './projects.service';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(@Body() body: CreateProjectInput) {
    return this.projectsService.create(body);
  }

  @Get()
  listProjects(@Query('organizationId') organizationId?: string) {
    return this.projectsService.list(organizationId);
  }
}
