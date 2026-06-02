CREATE TABLE "ProcurementApprovalRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxAmount" DOUBLE PRECISION,
    "approverRoleCode" TEXT NOT NULL DEFAULT 'APPROVER',
    "requiresSegregation" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementApprovalRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProcurementApprovalRule_organizationId_idx" ON "ProcurementApprovalRule"("organizationId");
CREATE INDEX "ProcurementApprovalRule_isActive_idx" ON "ProcurementApprovalRule"("isActive");

ALTER TABLE "ProcurementApprovalRule"
ADD CONSTRAINT "ProcurementApprovalRule_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
