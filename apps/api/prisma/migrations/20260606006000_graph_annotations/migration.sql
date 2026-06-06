CREATE TABLE "GraphAnnotation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "viewId" TEXT,
    "nodeEntityType" TEXT,
    "nodeEntityId" TEXT,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GraphAnnotation_organizationId_idx" ON "GraphAnnotation"("organizationId");
CREATE INDEX "GraphAnnotation_viewId_idx" ON "GraphAnnotation"("viewId");
CREATE INDEX "GraphAnnotation_nodeEntityType_nodeEntityId_idx" ON "GraphAnnotation"("nodeEntityType", "nodeEntityId");
CREATE INDEX "GraphAnnotation_createdByUserId_idx" ON "GraphAnnotation"("createdByUserId");
CREATE INDEX "GraphAnnotation_visibility_idx" ON "GraphAnnotation"("visibility");
CREATE INDEX "GraphAnnotation_createdAt_idx" ON "GraphAnnotation"("createdAt");

ALTER TABLE "GraphAnnotation" ADD CONSTRAINT "GraphAnnotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GraphAnnotation" ADD CONSTRAINT "GraphAnnotation_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "GraphSavedView"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GraphAnnotation" ADD CONSTRAINT "GraphAnnotation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GraphAnnotation" ADD CONSTRAINT "GraphAnnotation_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
