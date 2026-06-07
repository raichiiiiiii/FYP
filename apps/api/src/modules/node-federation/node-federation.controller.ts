import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { NodeFederationService } from './node-federation.service';

type ScopedQuery = {
  organizationId?: string;
  actorUserId?: string;
  localNodeKey?: string;
};

type CreatePeerBody = ScopedQuery & {
  peerNodeKey?: string;
  peerOrganizationName?: string;
  peerNodeType?: string;
  peerApiUrl?: string;
  peerWebUrl?: string;
  metadata?: unknown;
};

type CreateChannelBody = ScopedQuery & {
  channelName?: string;
  channelType?: string;
  purpose?: string;
  visibilityScope?: string;
  status?: string;
  metadata?: unknown;
};

type InviteChannelBody = ScopedQuery & {
  peerId?: string;
  peerNodeKey?: string;
  peerOrganizationName?: string;
  peerNodeType?: string;
  peerApiUrl?: string;
  peerWebUrl?: string;
};

type ReceiveNodeEventBody = {
  localNodeKey?: string;
  eventType?: string;
  idempotencyKey?: string;
  sourceNode?: {
    nodeKey?: string;
    organizationName?: string;
    nodeType?: string;
    apiUrl?: string;
    webUrl?: string;
  };
  channel?: {
    channelName?: string;
    channelType?: string;
    purpose?: string;
    visibilityScope?: string;
    status?: string;
  };
  memberships?: Array<{
    nodeKey?: string;
    organizationName?: string;
    nodeType?: string;
    peerApiUrl?: string;
    peerWebUrl?: string;
    membershipStatus?: string;
  }>;
  payload?: unknown;
};

@Controller('node-federation')
export class NodeFederationController {
  constructor(private readonly nodeFederation: NodeFederationService) {}

  @Get('status')
  getStatus(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('localNodeKey') localNodeKey?: string,
  ) {
    return this.nodeFederation.getStatus({
      organizationId,
      actorUserId,
      localNodeKey,
    });
  }

  @Get('peers')
  listPeers(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('localNodeKey') localNodeKey?: string,
  ) {
    return this.nodeFederation.listPeers({
      organizationId,
      actorUserId,
      localNodeKey,
    });
  }

  @Post('peers')
  createPeer(@Body() body: CreatePeerBody) {
    return this.nodeFederation.createPeer(body);
  }

  @Post('peers/:peerId/ping')
  pingPeer(@Param('peerId') peerId: string, @Body() body: ScopedQuery) {
    return this.nodeFederation.pingPeer({ ...body, peerId });
  }

  @Get('channels')
  listChannels(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('localNodeKey') localNodeKey?: string,
  ) {
    return this.nodeFederation.listChannels({
      organizationId,
      actorUserId,
      localNodeKey,
    });
  }

  @Post('channels')
  createChannel(@Body() body: CreateChannelBody) {
    return this.nodeFederation.createChannel(body);
  }

  @Post('channels/:channelId/invite')
  inviteChannel(
    @Param('channelId') channelId: string,
    @Body() body: InviteChannelBody,
  ) {
    return this.nodeFederation.inviteChannel({ ...body, channelId });
  }

  @Post('invitations/:invitationId/accept')
  acceptInvitation(
    @Param('invitationId') invitationId: string,
    @Body() body: ScopedQuery,
  ) {
    return this.nodeFederation.acceptInvitation({ ...body, invitationId });
  }

  @Post('events')
  receiveEvent(
    @Body() body: ReceiveNodeEventBody,
    @Headers() headers: Record<string, string>,
  ) {
    return this.nodeFederation.receiveEvent(body, headers);
  }

  @Get('canvas')
  getCanvas(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('localNodeKey') localNodeKey?: string,
  ) {
    return this.nodeFederation.getCanvas({
      organizationId,
      actorUserId,
      localNodeKey,
    });
  }
}
