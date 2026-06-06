CREATE TABLE "GraphSavedView" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "layout" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphSavedView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GraphSavedView_organizationId_ownerUserId_name_key" ON "GraphSavedView"("organizationId", "ownerUserId", "name");
CREATE INDEX "GraphSavedView_organizationId_idx" ON "GraphSavedView"("organizationId");
CREATE INDEX "GraphSavedView_ownerUserId_idx" ON "GraphSavedView"("ownerUserId");
CREATE INDEX "GraphSavedView_visibility_idx" ON "GraphSavedView"("visibility");
CREATE INDEX "GraphSavedView_createdAt_idx" ON "GraphSavedView"("createdAt");

ALTER TABLE "GraphSavedView" ADD CONSTRAINT "GraphSavedView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GraphSavedView" ADD CONSTRAINT "GraphSavedView_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
