ALTER TABLE "LossException"
ADD COLUMN "reviewerUserId" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN "decision" TEXT,
ADD COLUMN "rationale" TEXT,
ADD COLUMN "evidenceRefs" JSONB,
ADD COLUMN "decidedAt" TIMESTAMP(3),
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "LossException"
SET "exceptionType" = 'GENUINE_COMMERCIAL_LOSS'
WHERE "exceptionType" = 'BUSINESS_LOSS';

CREATE INDEX "LossException_reviewerUserId_idx" ON "LossException"("reviewerUserId");
CREATE INDEX "LossException_exceptionType_idx" ON "LossException"("exceptionType");
CREATE INDEX "LossException_status_idx" ON "LossException"("status");

ALTER TABLE "LossException"
ADD CONSTRAINT "LossException_reviewerUserId_fkey"
FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
