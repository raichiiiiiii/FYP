import {
  buildFabricAnchorCommand,
  calculateFabricAnchorId,
  deriveFabricIdempotencyKey,
} from './fabric-anchor-payload';

const canonicalHash =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('fabric anchor payload', () => {
  it('builds deterministic anchor IDs from the Fabric idempotency key', () => {
    const idempotencyKey = deriveFabricIdempotencyKey({
      organizationId: 'org-1',
      entityType: 'PurchaseOrder',
      entityId: 'po-1',
      canonicalHash,
    });

    expect(idempotencyKey).toBe(
      `fabric:org-1:PurchaseOrder:po-1:${canonicalHash}`,
    );
    expect(calculateFabricAnchorId(idempotencyKey)).toHaveLength(64);
    expect(calculateFabricAnchorId(idempotencyKey)).toBe(
      calculateFabricAnchorId(idempotencyKey),
    );
  });

  it('creates hash-only chaincode arguments and ignores confidential payload fields', () => {
    const command = buildFabricAnchorCommand({
      organizationId: 'org-1',
      entityType: 'PurchaseOrder',
      entityId: 'po-1',
      canonicalHash,
      timestamp: '2026-06-05T00:00:00.000Z',
      hashRecordId: 'hash-1',
      canonicalJson: { supplierBankAccount: 'SECRET' },
      documentBody: 'full document body',
      invoiceContents: 'invoice line items',
      privateKey: 'private key text',
    });

    expect(command.chaincodeArgs).toEqual([
      command.anchorId,
      'org-1',
      'PurchaseOrder',
      'po-1',
      canonicalHash,
      '2026-06-05T00:00:00.000Z',
      `fabric:org-1:PurchaseOrder:po-1:${canonicalHash}`,
      JSON.stringify({
        hashRecordId: 'hash-1',
        source: 'mepn-worker',
      }),
    ]);
    expect(JSON.stringify(command.chaincodeArgs)).not.toContain('SECRET');
    expect(JSON.stringify(command.chaincodeArgs)).not.toContain(
      'full document body',
    );
    expect(JSON.stringify(command.chaincodeArgs)).not.toContain(
      'invoice line items',
    );
    expect(JSON.stringify(command.chaincodeArgs)).not.toContain(
      'private key text',
    );
  });

  it('rejects non-SHA-256 canonical hashes before reaching Fabric', () => {
    expect(() =>
      buildFabricAnchorCommand({
        organizationId: 'org-1',
        entityType: 'PurchaseOrder',
        entityId: 'po-1',
        canonicalHash: 'abc123',
      }),
    ).toThrow('canonicalHash must be a SHA-256 hex digest');
  });
});
