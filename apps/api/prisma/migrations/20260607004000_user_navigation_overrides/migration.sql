CREATE TABLE "UserNavigationOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "setByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNavigationOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNavigationOverride_organizationId_userId_routePath_key" ON "UserNavigationOverride"("organizationId", "userId", "routePath");
CREATE INDEX "UserNavigationOverride_organizationId_idx" ON "UserNavigationOverride"("organizationId");
CREATE INDEX "UserNavigationOverride_userId_idx" ON "UserNavigationOverride"("userId");
CREATE INDEX "UserNavigationOverride_setByUserId_idx" ON "UserNavigationOverride"("setByUserId");

ALTER TABLE "UserNavigationOverride" ADD CONSTRAINT "UserNavigationOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserNavigationOverride" ADD CONSTRAINT "UserNavigationOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserNavigationOverride" ADD CONSTRAINT "UserNavigationOverride_setByUserId_fkey" FOREIGN KEY ("setByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
