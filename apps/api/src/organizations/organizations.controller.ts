import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organizations.service';
import { OrganizationsService } from './organizations.service';

@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  createOrganization(@Body() body: CreateOrganizationInput) {
    return this.organizationsService.create(body);
  }

  @Get(':id')
  getOrganization(@Param('id') id: string) {
    return this.organizationsService.getById(id);
  }

  @Patch(':id')
  updateOrganization(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationInput,
  ) {
    return this.organizationsService.update(id, body);
  }
}
