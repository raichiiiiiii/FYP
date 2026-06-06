import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  CreateApprovalRuleInput,
  UpdateApprovalRuleInput,
} from './procurement-operations.service';
import { ProcurementOperationsService } from './procurement-operations.service';

@Controller('procurement')
export class ProcurementOperationsController {
  constructor(
    private readonly procurementOperationsService: ProcurementOperationsService,
  ) {}

  @Get('summary')
  getSummary(
    @Query('organizationId') organizationId?: string,
    @Query('roleCodes') roleCodes?: string,
  ) {
    return this.procurementOperationsService.getSummary(
      organizationId,
      parseRoleCodes(roleCodes),
    );
  }

  @Get('approvals')
  listApprovalTasks(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.procurementOperationsService.listApprovalTasks(
      organizationId,
      actorUserId,
    );
  }

  @Get('approval-rules')
  listApprovalRules(@Query('organizationId') organizationId?: string) {
    return this.procurementOperationsService.listApprovalRules(organizationId);
  }

  @Post('approval-rules')
  createApprovalRule(@Body() body: CreateApprovalRuleInput) {
    return this.procurementOperationsService.createApprovalRule(body);
  }

  @Patch('approval-rules/:id')
  updateApprovalRule(
    @Param('id') id: string,
    @Body() body: UpdateApprovalRuleInput,
  ) {
    return this.procurementOperationsService.updateApprovalRule(id, body);
  }

  @Get('matching')
  getReceiptInvoiceMatching(@Query('organizationId') organizationId?: string) {
    return this.procurementOperationsService.getReceiptInvoiceMatching(
      organizationId,
    );
  }
}

function parseRoleCodes(value?: string) {
  return value
    ? value
        .split(',')
        .map((roleCode) => roleCode.trim())
        .filter(Boolean)
    : [];
}
