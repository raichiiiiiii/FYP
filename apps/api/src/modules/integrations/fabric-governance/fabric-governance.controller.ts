import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { FabricGovernanceService } from './fabric-governance.service';

type ScopedBody = {
  organizationId?: string;
  actorUserId?: string;
};

type CreateNetworkBody = ScopedBody & {
  name?: string;
  environment?: string;
  operatorOrganizationId?: string;
};

type CreateChannelBody = ScopedBody & {
  fabricNetworkId?: string;
  networkName?: string;
  networkEnvironment?: string;
  channelName?: string;
  chaincodeName?: string;
  mspId?: string;
  invitedOrganizationId?: string;
  invitedEmail?: string;
  invitedMspId?: string;
};

type CreateInvitationBody = ScopedBody & {
  invitedOrganizationId?: string;
  invitedEmail?: string;
  invitedMspId?: string;
  expiresAt?: string;
};

type AcceptInvitationBody = ScopedBody & {
  mspId?: string;
  certificateFingerprint?: string;
  certificateIssuer?: string;
  certificateExpiresAt?: string;
};

type ProposalBody = ScopedBody & {
  proposalType?: string;
  proposalPayload?: unknown;
  requiredApprovals?: number;
  rationale?: string;
};

type OperatorEvidenceBody = ScopedBody & {
  evidenceType?: string;
  storageUri?: string;
  contentHash?: string;
  metadata?: unknown;
  operatorSummary?: string;
  failureReason?: string;
};

@Controller('fabric')
export class FabricGovernanceController {
  constructor(private readonly fabricGovernance: FabricGovernanceService) {}

  @Get('networks')
  listNetworks(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.listNetworks({ organizationId, actorUserId });
  }

  @Post('networks')
  createNetwork(@Body() body: CreateNetworkBody) {
    return this.fabricGovernance.createNetwork(body);
  }

  @Get('channels')
  listChannels(
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.listChannels({ organizationId, actorUserId });
  }

  @Post('channels')
  createChannel(@Body() body: CreateChannelBody) {
    return this.fabricGovernance.createChannel(body);
  }

  @Get('channels/:id')
  getChannel(
    @Param('id') fabricChannelId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.getChannel({
      fabricChannelId,
      organizationId,
      actorUserId,
    });
  }

  @Get('channels/:id/readiness')
  getChannelReadiness(
    @Param('id') fabricChannelId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.getReadiness({
      fabricChannelId,
      organizationId,
      actorUserId,
    });
  }

  @Post('channels/:id/invitations')
  createInvitation(
    @Param('id') fabricChannelId: string,
    @Body() body: CreateInvitationBody,
  ) {
    return this.fabricGovernance.createInvitation({
      ...body,
      fabricChannelId,
    });
  }

  @Get('channels/:id/invitations')
  listInvitations(
    @Param('id') fabricChannelId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.listInvitations({
      fabricChannelId,
      organizationId,
      actorUserId,
    });
  }

  @Post('channel-invitations/:id/accept')
  acceptInvitation(
    @Param('id') invitationId: string,
    @Body() body: AcceptInvitationBody,
  ) {
    return this.fabricGovernance.acceptInvitation({ ...body, invitationId });
  }

  @Post('channel-invitations/:id/revoke')
  revokeInvitation(
    @Param('id') invitationId: string,
    @Body() body: ScopedBody,
  ) {
    return this.fabricGovernance.revokeInvitation({ ...body, invitationId });
  }

  @Get('channels/:id/memberships')
  listMemberships(
    @Param('id') fabricChannelId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.listMemberships({
      fabricChannelId,
      organizationId,
      actorUserId,
    });
  }

  @Post('channels/:id/proposals')
  createProposal(
    @Param('id') fabricChannelId: string,
    @Body() body: ProposalBody,
  ) {
    return this.fabricGovernance.createProposal({
      ...body,
      fabricChannelId,
    });
  }

  @Get('channel-proposals/:id')
  getProposal(
    @Param('id') proposalId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.getProposal({
      proposalId,
      organizationId,
      actorUserId,
    });
  }

  @Post('channel-proposals/:id/approve')
  approveProposal(@Param('id') proposalId: string, @Body() body: ProposalBody) {
    return this.fabricGovernance.approveProposal({ ...body, proposalId });
  }

  @Post('channel-proposals/:id/reject')
  rejectProposal(@Param('id') proposalId: string, @Body() body: ProposalBody) {
    return this.fabricGovernance.rejectProposal({ ...body, proposalId });
  }

  @Post('channel-proposals/:id/cancel')
  cancelProposal(@Param('id') proposalId: string, @Body() body: ProposalBody) {
    return this.fabricGovernance.cancelProposal({ ...body, proposalId });
  }

  @Post('channel-proposals/:id/operator-execution')
  recordOperatorExecution(
    @Param('id') proposalId: string,
    @Body() body: OperatorEvidenceBody,
  ) {
    return this.fabricGovernance.recordOperatorExecution({
      ...body,
      proposalId,
    });
  }

  @Post('channel-proposals/:id/operator-failure')
  recordOperatorFailure(
    @Param('id') proposalId: string,
    @Body() body: OperatorEvidenceBody,
  ) {
    return this.fabricGovernance.recordOperatorFailure({
      ...body,
      proposalId,
    });
  }

  @Get('channel-proposals/:id/evidence')
  listEvidence(
    @Param('id') proposalId: string,
    @Query('organizationId') organizationId?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.fabricGovernance.listEvidence({
      proposalId,
      organizationId,
      actorUserId,
    });
  }
}
