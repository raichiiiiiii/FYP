import { AuditHashService } from '../../../src/modules/audit/audit-hash.service';

describe('FR-50 Canonical hash unit rules', () => {
  const service = new AuditHashService({} as never);

  it('produces the same SHA-256 hash for the same canonical input', () => {
    const left = service.hashCanonicalJson({
      entityType: 'PurchaseOrder',
      entityId: 'po-1',
      totalAmount: '12000.00',
      supplierId: 'supplier-1',
    });
    const right = service.hashCanonicalJson({
      supplierId: 'supplier-1',
      totalAmount: '12000.00',
      entityId: 'po-1',
      entityType: 'PurchaseOrder',
    });

    expect(left.hashAlgorithm).toBe('SHA-256');
    expect(left.canonicalText).toBe(right.canonicalText);
    expect(left.canonicalHash).toBe(right.canonicalHash);
  });

  it('changes the hash when a document amount changes', () => {
    const original = service.hashCanonicalJson({
      entityType: 'Invoice',
      entityId: 'invoice-1',
      amount: '12000.00',
    });
    const changed = service.hashCanonicalJson({
      entityType: 'Invoice',
      entityId: 'invoice-1',
      amount: '12000.01',
    });

    expect(changed.canonicalHash).not.toBe(original.canonicalHash);
  });

  it('normalizes dates to stable ISO timestamp strings', () => {
    const result = service.hashCanonicalJson({
      issuedAt: new Date('2026-06-02T00:00:00.000Z'),
    });

    expect(result.canonicalText).toBe(
      '{"issuedAt":"2026-06-02T00:00:00.000Z"}',
    );
  });
});
