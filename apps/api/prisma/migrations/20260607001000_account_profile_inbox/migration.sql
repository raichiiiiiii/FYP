ALTER TABLE "User" ADD COLUMN "profileImageUrl" TEXT;

CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientRoleCode" TEXT,
    "itemType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InboxItem_organizationId_idx" ON "InboxItem"("organizationId");
CREATE INDEX "InboxItem_senderUserId_idx" ON "InboxItem"("senderUserId");
CREATE INDEX "InboxItem_recipientUserId_idx" ON "InboxItem"("recipientUserId");
CREATE INDEX "InboxItem_recipientRoleCode_idx" ON "InboxItem"("recipientRoleCode");
CREATE INDEX "InboxItem_itemType_idx" ON "InboxItem"("itemType");
CREATE INDEX "InboxItem_status_idx" ON "InboxItem"("status");
CREATE INDEX "InboxItem_createdAt_idx" ON "InboxItem"("createdAt");

ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
