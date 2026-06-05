import { Module } from '@nestjs/common';
import { AuditEventsModule } from '../../audit-events/audit-events.module';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { OutboxModule } from '../outbox/outbox.module';
import { DocumentsController } from './documents/documents.controller';
import { DocumentsService } from './documents/documents.service';
import { EvidenceItemsController } from './evidence-items/evidence-items.controller';
import { EvidenceItemsService } from './evidence-items/evidence-items.service';
import { EvidencePacksController } from './evidence-packs/evidence-packs.controller';
import { EvidencePacksService } from './evidence-packs/evidence-packs.service';
import { FabricChaincodeQueryService } from './hash-records/fabric-chaincode-query.service';
import { HashRecordsController } from './hash-records/hash-records.controller';
import { HashRecordsService } from './hash-records/hash-records.service';
import { ObjectStorageService } from './object-storage/object-storage.service';

@Module({
  imports: [DatabaseModule, AuditEventsModule, AuditModule, OutboxModule],
  controllers: [
    DocumentsController,
    EvidenceItemsController,
    EvidencePacksController,
    HashRecordsController,
  ],
  providers: [
    DocumentsService,
    EvidenceItemsService,
    EvidencePacksService,
    FabricChaincodeQueryService,
    HashRecordsService,
    ObjectStorageService,
  ],
  exports: [ObjectStorageService],
})
export class EvidenceModule {}
