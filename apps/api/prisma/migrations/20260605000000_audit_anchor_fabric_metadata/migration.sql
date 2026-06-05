-- Add real Fabric Gateway metadata fields to audit anchors.
-- These fields are nullable so mock/local anchors and existing rows remain valid.

ALTER TABLE "AuditAnchor" ADD COLUMN "fabricTransactionId" TEXT;
ALTER TABLE "AuditAnchor" ADD COLUMN "fabricBlockNumber" INTEGER;
ALTER TABLE "AuditAnchor" ADD COLUMN "fabricChannel" TEXT;
ALTER TABLE "AuditAnchor" ADD COLUMN "fabricChaincode" TEXT;
ALTER TABLE "AuditAnchor" ADD COLUMN "fabricCommitStatus" TEXT;
ALTER TABLE "AuditAnchor" ADD COLUMN "fabricEndorsementStatus" TEXT;
ALTER TABLE "AuditAnchor" ADD COLUMN "fabricVerifiedAt" TIMESTAMP(3);

CREATE INDEX "AuditAnchor_fabricTransactionId_idx" ON "AuditAnchor"("fabricTransactionId");
CREATE INDEX "AuditAnchor_fabricChannel_fabricChaincode_idx" ON "AuditAnchor"("fabricChannel", "fabricChaincode");
