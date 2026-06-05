package main

import "testing"

const testHash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

func TestCalculateAnchorIDIsDeterministic(t *testing.T) {
	idempotencyKey := "fabric:org-1:PurchaseOrder:po-1:" + testHash

	first := CalculateAnchorID(idempotencyKey)
	second := CalculateAnchorID(idempotencyKey)

	if first != second {
		t.Fatalf("expected deterministic anchor ID, got %s and %s", first, second)
	}
	if len(first) != 64 {
		t.Fatalf("expected SHA-256 hex anchor ID length 64, got %d", len(first))
	}
}

func TestNewAuditAnchorRejectsMismatchedAnchorID(t *testing.T) {
	_, err := NewAuditAnchor(CreateAnchorInput{
		AnchorID:       "not-the-hash",
		EntityType:     "PurchaseOrder",
		EntityID:       "po-1",
		CanonicalHash:  testHash,
		Timestamp:      "2026-06-05T00:00:00Z",
		IdempotencyKey: "fabric:org-1:PurchaseOrder:po-1:" + testHash,
	})

	if err == nil {
		t.Fatal("expected mismatched anchor ID to fail")
	}
}

func TestNewAuditAnchorCreatesHashOnlyRecord(t *testing.T) {
	idempotencyKey := "fabric:org-1:PurchaseOrder:po-1:" + testHash
	anchorID := CalculateAnchorID(idempotencyKey)

	anchor, err := NewAuditAnchor(CreateAnchorInput{
		AnchorID:       anchorID,
		OrganizationID: "org-1",
		EntityType:     "PurchaseOrder",
		EntityID:       "po-1",
		CanonicalHash:  testHash,
		Timestamp:      "2026-06-05T00:00:00Z",
		IdempotencyKey: idempotencyKey,
		MetadataJSON:   `{"source":"unit-test"}`,
	})

	if err != nil {
		t.Fatalf("expected anchor, got error: %v", err)
	}
	if anchor.AnchorID != anchorID {
		t.Fatalf("expected anchor ID %s, got %s", anchorID, anchor.AnchorID)
	}
	if anchor.HashAlgorithm != hashAlgorithm {
		t.Fatalf("expected hash algorithm %s, got %s", hashAlgorithm, anchor.HashAlgorithm)
	}
	if anchor.MetadataHash == "" {
		t.Fatal("expected metadata hash, got empty string")
	}
}

func TestReconcileExistingAnchorReturnsSameAnchorForDuplicate(t *testing.T) {
	idempotencyKey := "fabric:org-1:PurchaseOrder:po-1:" + testHash
	anchorID := CalculateAnchorID(idempotencyKey)

	existing, err := NewAuditAnchor(CreateAnchorInput{
		AnchorID:       anchorID,
		OrganizationID: "org-1",
		EntityType:     "PurchaseOrder",
		EntityID:       "po-1",
		CanonicalHash:  testHash,
		Timestamp:      "2026-06-05T00:00:00Z",
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("expected existing anchor, got error: %v", err)
	}

	reconciled, err := ReconcileExistingAnchor(existing, CreateAnchorInput{
		AnchorID:       anchorID,
		OrganizationID: "org-1",
		EntityType:     "PurchaseOrder",
		EntityID:       "po-1",
		CanonicalHash:  testHash,
		Timestamp:      "2026-06-05T00:00:01Z",
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("expected duplicate to reconcile, got error: %v", err)
	}
	if reconciled != existing {
		t.Fatal("expected existing anchor pointer to be returned")
	}
}

func TestReconcileExistingAnchorRejectsConflict(t *testing.T) {
	idempotencyKey := "fabric:org-1:PurchaseOrder:po-1:" + testHash
	anchorID := CalculateAnchorID(idempotencyKey)

	existing, err := NewAuditAnchor(CreateAnchorInput{
		AnchorID:       anchorID,
		OrganizationID: "org-1",
		EntityType:     "PurchaseOrder",
		EntityID:       "po-1",
		CanonicalHash:  testHash,
		Timestamp:      "2026-06-05T00:00:00Z",
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("expected existing anchor, got error: %v", err)
	}

	_, err = ReconcileExistingAnchor(existing, CreateAnchorInput{
		AnchorID:       anchorID,
		OrganizationID: "org-1",
		EntityType:     "PurchaseOrder",
		EntityID:       "po-1",
		CanonicalHash:  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		Timestamp:      "2026-06-05T00:00:01Z",
		IdempotencyKey: idempotencyKey,
	})

	if err == nil {
		t.Fatal("expected conflicting anchor to fail")
	}
}
