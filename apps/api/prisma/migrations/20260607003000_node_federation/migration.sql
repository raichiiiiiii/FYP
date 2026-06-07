-- Local/UAT node federation metadata.
-- This stores simulated node/channel state only; it does not store Fabric admin
-- material and does not mutate real Fabric topology.

CREATE TABLE "NodeDeployment" (
  "id" TEXT NOT NULL,
  "nodeKey" TEXT NOT NULL,
  "organizationId" TEXT,
  "displayName" TEXT NOT NULL,
  "nodeType" TEXT NOT NULL,
  "publicWebUrl" TEXT,
  "publicApiUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'local',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NodeDeployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NodePeer" (
  "id" TEXT NOT NULL,
  "localNodeId" TEXT NOT NULL,
  "peerNodeKey" TEXT NOT NULL,
  "peerOrganizationName" TEXT NOT NULL,
  "peerNodeType" TEXT NOT NULL,
  "peerApiUrl" TEXT,
  "peerWebUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'configured',
  "lastSeenAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NodePeer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NodeChannel" (
  "id" TEXT NOT NULL,
  "localNodeId" TEXT NOT NULL,
  "channelName" TEXT NOT NULL,
  "channelType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'simulated_proposed',
  "purpose" TEXT,
  "visibilityScope" TEXT NOT NULL DEFAULT 'organization',
  "createdByNodeKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NodeChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NodeChannelMembership" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "nodeKey" TEXT NOT NULL,
  "organizationName" TEXT NOT NULL,
  "nodeType" TEXT NOT NULL,
  "membershipStatus" TEXT NOT NULL DEFAULT 'simulated_invited',
  "peerApiUrl" TEXT,
  "peerWebUrl" TEXT,
  "joinedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NodeChannelMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboundNodeEvent" (
  "id" TEXT NOT NULL,
  "localNodeId" TEXT NOT NULL,
  "peerId" TEXT,
  "eventType" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutboundNodeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InboundNodeEvent" (
  "id" TEXT NOT NULL,
  "localNodeId" TEXT NOT NULL,
  "sourceNodeKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processed',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "error" TEXT,

  CONSTRAINT "InboundNodeEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NodeDeployment_nodeKey_key" ON "NodeDeployment"("nodeKey");
CREATE INDEX "NodeDeployment_organizationId_idx" ON "NodeDeployment"("organizationId");
CREATE INDEX "NodeDeployment_nodeType_idx" ON "NodeDeployment"("nodeType");
CREATE INDEX "NodeDeployment_status_idx" ON "NodeDeployment"("status");

CREATE UNIQUE INDEX "NodePeer_localNodeId_peerNodeKey_key" ON "NodePeer"("localNodeId", "peerNodeKey");
CREATE INDEX "NodePeer_peerNodeKey_idx" ON "NodePeer"("peerNodeKey");
CREATE INDEX "NodePeer_status_idx" ON "NodePeer"("status");

CREATE UNIQUE INDEX "NodeChannel_localNodeId_channelName_key" ON "NodeChannel"("localNodeId", "channelName");
CREATE INDEX "NodeChannel_channelType_idx" ON "NodeChannel"("channelType");
CREATE INDEX "NodeChannel_status_idx" ON "NodeChannel"("status");
CREATE INDEX "NodeChannel_createdByNodeKey_idx" ON "NodeChannel"("createdByNodeKey");

CREATE UNIQUE INDEX "NodeChannelMembership_channelId_nodeKey_key" ON "NodeChannelMembership"("channelId", "nodeKey");
CREATE INDEX "NodeChannelMembership_nodeKey_idx" ON "NodeChannelMembership"("nodeKey");
CREATE INDEX "NodeChannelMembership_membershipStatus_idx" ON "NodeChannelMembership"("membershipStatus");

CREATE UNIQUE INDEX "OutboundNodeEvent_idempotencyKey_key" ON "OutboundNodeEvent"("idempotencyKey");
CREATE INDEX "OutboundNodeEvent_localNodeId_idx" ON "OutboundNodeEvent"("localNodeId");
CREATE INDEX "OutboundNodeEvent_peerId_idx" ON "OutboundNodeEvent"("peerId");
CREATE INDEX "OutboundNodeEvent_eventType_idx" ON "OutboundNodeEvent"("eventType");
CREATE INDEX "OutboundNodeEvent_status_idx" ON "OutboundNodeEvent"("status");

CREATE UNIQUE INDEX "InboundNodeEvent_idempotencyKey_key" ON "InboundNodeEvent"("idempotencyKey");
CREATE INDEX "InboundNodeEvent_localNodeId_idx" ON "InboundNodeEvent"("localNodeId");
CREATE INDEX "InboundNodeEvent_sourceNodeKey_idx" ON "InboundNodeEvent"("sourceNodeKey");
CREATE INDEX "InboundNodeEvent_eventType_idx" ON "InboundNodeEvent"("eventType");
CREATE INDEX "InboundNodeEvent_status_idx" ON "InboundNodeEvent"("status");

ALTER TABLE "NodeDeployment"
  ADD CONSTRAINT "NodeDeployment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NodePeer"
  ADD CONSTRAINT "NodePeer_localNodeId_fkey"
  FOREIGN KEY ("localNodeId") REFERENCES "NodeDeployment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NodeChannel"
  ADD CONSTRAINT "NodeChannel_localNodeId_fkey"
  FOREIGN KEY ("localNodeId") REFERENCES "NodeDeployment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NodeChannelMembership"
  ADD CONSTRAINT "NodeChannelMembership_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "NodeChannel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutboundNodeEvent"
  ADD CONSTRAINT "OutboundNodeEvent_localNodeId_fkey"
  FOREIGN KEY ("localNodeId") REFERENCES "NodeDeployment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutboundNodeEvent"
  ADD CONSTRAINT "OutboundNodeEvent_peerId_fkey"
  FOREIGN KEY ("peerId") REFERENCES "NodePeer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InboundNodeEvent"
  ADD CONSTRAINT "InboundNodeEvent_localNodeId_fkey"
  FOREIGN KEY ("localNodeId") REFERENCES "NodeDeployment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
