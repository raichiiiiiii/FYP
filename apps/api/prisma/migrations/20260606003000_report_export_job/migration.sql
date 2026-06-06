CREATE TABLE "ReportExportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "requestedByUserId" TEXT,
    "filePath" TEXT,
    "objectKey" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportExportJob_organizationId_idx" ON "ReportExportJob"("organizationId");
CREATE INDEX "ReportExportJob_requestedByUserId_idx" ON "ReportExportJob"("requestedByUserId");
CREATE INDEX "ReportExportJob_reportType_idx" ON "ReportExportJob"("reportType");
CREATE INDEX "ReportExportJob_format_idx" ON "ReportExportJob"("format");
CREATE INDEX "ReportExportJob_status_idx" ON "ReportExportJob"("status");
CREATE INDEX "ReportExportJob_createdAt_idx" ON "ReportExportJob"("createdAt");

ALTER TABLE "ReportExportJob" ADD CONSTRAINT "ReportExportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportExportJob" ADD CONSTRAINT "ReportExportJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
