-- Replace raw invitation tokens with non-secret token hashes.
-- Existing legacy invite links cannot be accepted after this migration because
-- their raw tokens were intentionally not preserved.

DROP INDEX IF EXISTS "Invitation_token_key";

ALTER TABLE "Invitation" DROP COLUMN IF EXISTS "token";
ALTER TABLE "Invitation" ADD COLUMN "tokenHash" TEXT;

UPDATE "Invitation"
SET "tokenHash" = 'legacy-migrated:' || "id"
WHERE "tokenHash" IS NULL;

ALTER TABLE "Invitation" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "Invitation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");
