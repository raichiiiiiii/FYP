import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { OutboxModule } from '../outbox/outbox.module';
import { ApplicationsController } from './applications/applications.controller';
import { ClosuresController } from './closures/closures.controller';
import { ContractsController } from './contracts/contracts.controller';
import { DisbursementsController } from './disbursements/disbursements.controller';
import { EvidenceChecklistsController } from './evidence-checklists/evidence-checklists.controller';
import { FinanceService } from './finance.service';
import { LossExceptionsController } from './loss-exceptions/loss-exceptions.controller';
import { OpportunitiesController } from './opportunities/opportunities.controller';
import { ProfitLossController } from './profit-loss/profit-loss.controller';
import { ProjectLedgersController } from './project-ledgers/project-ledgers.controller';
import { FinanceSummaryController } from './summary/finance-summary.controller';

@Module({
  imports: [DatabaseModule, AuditEventsModule, OutboxModule],
  controllers: [
    OpportunitiesController,
    ApplicationsController,
    EvidenceChecklistsController,
    ContractsController,
    DisbursementsController,
    ProjectLedgersController,
    ProfitLossController,
    LossExceptionsController,
    ClosuresController,
    FinanceSummaryController,
  ],
  providers: [FinanceService],
})
export class FinanceModule {}
