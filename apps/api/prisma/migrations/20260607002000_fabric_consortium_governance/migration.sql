CREATE TABLE "FabricNetwork" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'local',
    "governanceModel" TEXT NOT NULL DEFAULT 'operator_assisted',
    "operatorOrganizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricNetwork_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FabricChannel" (
    "id" TEXT NOT NULL,
    "fabricNetworkId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "chaincodeName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdByOrganizationId" TEXT NOT NULL,
    "operatorVerifiedAt" TIMESTAMP(3),
    "readinessStatus" TEXT NOT NULL DEFAULT 'operator_pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FabricChannelMembership" (
    "id" TEXT NOT NULL,
    "fabricChannelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "mspId" TEXT,
    "membershipStatus" TEXT NOT NULL DEFAULT 'invited',
    "certificateFingerprint" TEXT,
    "certificateIssuer" TEXT,
    "certificateExpiresAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricChannelMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FabricChannelInvitation" (
    "id" TEXT NOT NULL,
    "fabricChannelId" TEXT NOT NULL,
    "createdByOrganizationId" TEXT NOT NULL,
    "invitedOrganizationId" TEXT,
    "invitedEmail" TEXT,
    "invitedMspId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "acceptedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricChannelInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FabricChannelProposal" (
    "id" TEXT NOT NULL,
    "fabricChannelId" TEXT NOT NULL,
    "proposalType" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "proposalPayload" JSONB NOT NULL,
    "proposalDigest" TEXT NOT NULL,
    "requiredApprovals" INTEGER NOT NULL DEFAULT 2,
    "createdByUserId" TEXT NOT NULL,
    "operatorUserId" TEXT,
    "executedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "supersededByProposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricChannelProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FabricGovernanceApproval" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FabricGovernanceApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FabricGovernanceEvidence" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "storageUri" TEXT,
    "contentHash" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FabricGovernanceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FabricChannel_fabricNetworkId_channelName_key" ON "FabricChannel"("fabricNetworkId", "channelName");
CREATE UNIQUE INDEX "FabricChannelMembership_fabricChannelId_organizationId_key" ON "FabricChannelMembership"("fabricChannelId", "organizationId");
CREATE UNIQUE INDEX "FabricGovernanceApproval_proposalId_organizationId_actorUserId_key" ON "FabricGovernanceApproval"("proposalId", "organizationId", "actorUserId");

CREATE INDEX "FabricNetwork_operatorOrganizationId_idx" ON "FabricNetwork"("operatorOrganizationId");
CREATE INDEX "FabricNetwork_environment_idx" ON "FabricNetwork"("environment");
CREATE INDEX "FabricNetwork_status_idx" ON "FabricNetwork"("status");
CREATE INDEX "FabricChannel_createdByOrganizationId_idx" ON "FabricChannel"("createdByOrganizationId");
CREATE INDEX "FabricChannel_status_idx" ON "FabricChannel"("status");
CREATE INDEX "FabricChannel_readinessStatus_idx" ON "FabricChannel"("readinessStatus");
CREATE INDEX "FabricChannelMembership_organizationId_idx" ON "FabricChannelMembership"("organizationId");
CREATE INDEX "FabricChannelMembership_membershipStatus_idx" ON "FabricChannelMembership"("membershipStatus");
CREATE INDEX "FabricChannelInvitation_fabricChannelId_idx" ON "FabricChannelInvitation"("fabricChannelId");
CREATE INDEX "FabricChannelInvitation_createdByOrganizationId_idx" ON "FabricChannelInvitation"("createdByOrganizationId");
CREATE INDEX "FabricChannelInvitation_invitedOrganizationId_idx" ON "FabricChannelInvitation"("invitedOrganizationId");
CREATE INDEX "FabricChannelInvitation_invitedEmail_idx" ON "FabricChannelInvitation"("invitedEmail");
CREATE INDEX "FabricChannelInvitation_status_idx" ON "FabricChannelInvitation"("status");
CREATE INDEX "FabricChannelInvitation_expiresAt_idx" ON "FabricChannelInvitation"("expiresAt");
CREATE INDEX "FabricChannelProposal_fabricChannelId_idx" ON "FabricChannelProposal"("fabricChannelId");
CREATE INDEX "FabricChannelProposal_proposalType_idx" ON "FabricChannelProposal"("proposalType");
CREATE INDEX "FabricChannelProposal_status_idx" ON "FabricChannelProposal"("status");
CREATE INDEX "FabricChannelProposal_createdByUserId_idx" ON "FabricChannelProposal"("createdByUserId");
CREATE INDEX "FabricChannelProposal_operatorUserId_idx" ON "FabricChannelProposal"("operatorUserId");
CREATE INDEX "FabricChannelProposal_proposalDigest_idx" ON "FabricChannelProposal"("proposalDigest");
CREATE INDEX "FabricGovernanceApproval_organizationId_idx" ON "FabricGovernanceApproval"("organizationId");
CREATE INDEX "FabricGovernanceApproval_actorUserId_idx" ON "FabricGovernanceApproval"("actorUserId");
CREATE INDEX "FabricGovernanceApproval_decision_idx" ON "FabricGovernanceApproval"("decision");
CREATE INDEX "FabricGovernanceEvidence_proposalId_idx" ON "FabricGovernanceEvidence"("proposalId");
CREATE INDEX "FabricGovernanceEvidence_evidenceType_idx" ON "FabricGovernanceEvidence"("evidenceType");
CREATE INDEX "FabricGovernanceEvidence_createdByUserId_idx" ON "FabricGovernanceEvidence"("createdByUserId");
CREATE INDEX "FabricGovernanceEvidence_contentHash_idx" ON "FabricGovernanceEvidence"("contentHash");

ALTER TABLE "FabricNetwork" ADD CONSTRAINT "FabricNetwork_operatorOrganizationId_fkey" FOREIGN KEY ("operatorOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FabricChannel" ADD CONSTRAINT "FabricChannel_fabricNetworkId_fkey" FOREIGN KEY ("fabricNetworkId") REFERENCES "FabricNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannel" ADD CONSTRAINT "FabricChannel_createdByOrganizationId_fkey" FOREIGN KEY ("createdByOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannelMembership" ADD CONSTRAINT "FabricChannelMembership_fabricChannelId_fkey" FOREIGN KEY ("fabricChannelId") REFERENCES "FabricChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannelMembership" ADD CONSTRAINT "FabricChannelMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannelInvitation" ADD CONSTRAINT "FabricChannelInvitation_fabricChannelId_fkey" FOREIGN KEY ("fabricChannelId") REFERENCES "FabricChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannelInvitation" ADD CONSTRAINT "FabricChannelInvitation_createdByOrganizationId_fkey" FOREIGN KEY ("createdByOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannelInvitation" ADD CONSTRAINT "FabricChannelInvitation_invitedOrganizationId_fkey" FOREIGN KEY ("invitedOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FabricChannelInvitation" ADD CONSTRAINT "FabricChannelInvitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FabricChannelInvitation" ADD CONSTRAINT "FabricChannelInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FabricChannelProposal" ADD CONSTRAINT "FabricChannelProposal_fabricChannelId_fkey" FOREIGN KEY ("fabricChannelId") REFERENCES "FabricChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannelProposal" ADD CONSTRAINT "FabricChannelProposal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricChannelProposal" ADD CONSTRAINT "FabricChannelProposal_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FabricGovernanceApproval" ADD CONSTRAINT "FabricGovernanceApproval_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "FabricChannelProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricGovernanceApproval" ADD CONSTRAINT "FabricGovernanceApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricGovernanceApproval" ADD CONSTRAINT "FabricGovernanceApproval_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricGovernanceEvidence" ADD CONSTRAINT "FabricGovernanceEvidence_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "FabricChannelProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FabricGovernanceEvidence" ADD CONSTRAINT "FabricGovernanceEvidence_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
