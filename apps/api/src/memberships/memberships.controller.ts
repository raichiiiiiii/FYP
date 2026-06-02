import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CreateMembershipInput } from './memberships.service';
import { MembershipsService } from './memberships.service';

@Controller()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post('memberships')
  createMembership(@Body() body: CreateMembershipInput) {
    return this.membershipsService.create(body);
  }

  @Get('orgs/:orgId/memberships')
  listOrganizationMemberships(@Param('orgId') orgId: string) {
    return this.membershipsService.listByOrganization(orgId);
  }
}
