export type FabricAnchorInput = {
  organizationId?: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  canonicalHash: string;
  timestamp?: string;
};

export type FabricAnchorResult = {
  anchorId: string;
  entityType: string;
  entityId: string;
  canonicalHash: string;
  fabricTransactionId: string;
  fabricBlockNumber: number;
  status: 'ANCHORED_MOCK' | 'ANCHORED';
};

export interface FabricAnchorAdapter {
  anchor(input: FabricAnchorInput): Promise<FabricAnchorResult>;
}
