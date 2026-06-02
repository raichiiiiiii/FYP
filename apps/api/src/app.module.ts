import { Module } from '@nestjs/common';
import { AuditEventsModule } from './audit-events/audit-events.module';
import { HealthModule } from './health/health.module';
import { MembershipsModule } from './memberships/memberships.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { FinanceModule } from './modules/finance/finance.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    HealthModule,
    AuditEventsModule,
    OrganizationsModule,
    UsersModule,
    RolesModule,
    MembershipsModule,
    ProcurementModule,
    EvidenceModule,
    FinanceModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
