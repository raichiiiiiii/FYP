import { Module } from '@nestjs/common';
import { AuditEventsModule } from './audit-events/audit-events.module';
import { HealthModule } from './health/health.module';
import { MembershipsModule } from './memberships/memberships.module';
import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { FinanceModule } from './modules/finance/finance.module';
import { GraphModule } from './modules/graph/graph.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { NodeStatusModule } from './modules/node-status/node-status.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ReportsModule } from './modules/reports/reports.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    AccountModule,
    DashboardModule,
    AuditEventsModule,
    OrganizationsModule,
    UsersModule,
    RolesModule,
    MembershipsModule,
    ProcurementModule,
    ReportsModule,
    EvidenceModule,
    FinanceModule,
    GraphModule,
    InboxModule,
    IntegrationsModule,
    NodeStatusModule,
  ],
})
export class AppModule {}
