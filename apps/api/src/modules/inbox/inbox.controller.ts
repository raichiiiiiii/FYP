import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  CreateInboxMessageInput,
  CreatePermissionRequestInput,
  MarkInboxItemReadInput,
} from './inbox.service';
import { InboxService } from './inbox.service';

@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  list(
    @Query('organizationId') organizationId: string,
    @Query('actorUserId') actorUserId: string,
  ) {
    return this.inboxService.list({ organizationId, actorUserId });
  }

  @Post('messages')
  createMessage(@Body() body: CreateInboxMessageInput) {
    return this.inboxService.createMessage(body);
  }

  @Post('permission-requests')
  createPermissionRequest(@Body() body: CreatePermissionRequestInput) {
    return this.inboxService.createPermissionRequest(body);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Body() body: MarkInboxItemReadInput) {
    return this.inboxService.markRead(id, body);
  }
}
