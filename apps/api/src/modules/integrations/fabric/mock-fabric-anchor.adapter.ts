import { Injectable } from '@nestjs/common';
import type {
  FabricAnchorAdapter,
  FabricAnchorInput,
  FabricAnchorResult,
} from './fabric-anchor.adapter';

@Injectable()
export class MockFabricAnchorAdapter implements FabricAnchorAdapter {
  async anchor(input: FabricAnchorInput): Promise<FabricAnchorResult> {
    await Promise.resolve();

    const suffix =
      input.canonicalHash.slice(0, 12) || input.entityId.slice(0, 12);

    return {
      anchorId: `anchor_${input.entityId}`,
      entityType: input.entityType,
      entityId: input.entityId,
      canonicalHash: input.canonicalHash,
      fabricTransactionId: `mock-tx-${suffix}`,
      fabricBlockNumber: Math.max(
        1,
        Number.parseInt(suffix.slice(0, 6), 16) || 1,
      ),
      status: 'ANCHORED_MOCK',
    };
  }
}
