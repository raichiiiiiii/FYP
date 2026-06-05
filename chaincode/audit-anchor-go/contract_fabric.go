//go:build fabric

package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

type AuditAnchorContract struct {
	contractapi.Contract
}

func (c *AuditAnchorContract) CreateAnchor(
	ctx contractapi.TransactionContextInterface,
	anchorID string,
	organizationID string,
	entityType string,
	entityID string,
	canonicalHash string,
	timestamp string,
	idempotencyKey string,
	metadataJSON string,
) (*AuditAnchor, error) {
	existing, err := c.readAnchorIfExists(ctx, anchorID)
	if err != nil {
		return nil, err
	}

	anchor, err := ReconcileExistingAnchor(existing, CreateAnchorInput{
		AnchorID:       anchorID,
		OrganizationID: organizationID,
		EntityType:     entityType,
		EntityID:       entityID,
		CanonicalHash:  canonicalHash,
		Timestamp:      timestamp,
		IdempotencyKey: idempotencyKey,
		MetadataJSON:   metadataJSON,
	})
	if err != nil {
		return nil, err
	}

	if existing != nil {
		return anchor, nil
	}

	anchorBytes, err := json.Marshal(anchor)
	if err != nil {
		return nil, fmt.Errorf("marshal anchor: %w", err)
	}

	if err := ctx.GetStub().PutState(anchorStateKey(anchor.AnchorID), anchorBytes); err != nil {
		return nil, fmt.Errorf("put anchor state: %w", err)
	}

	hashIndexKey, err := ctx.GetStub().CreateCompositeKey("canonicalHash~anchorId", []string{
		anchor.CanonicalHash,
		anchor.AnchorID,
	})
	if err != nil {
		return nil, fmt.Errorf("create hash index: %w", err)
	}
	if err := ctx.GetStub().PutState(hashIndexKey, []byte{0}); err != nil {
		return nil, fmt.Errorf("put hash index: %w", err)
	}

	return anchor, nil
}

func (c *AuditAnchorContract) ReadAnchor(
	ctx contractapi.TransactionContextInterface,
	anchorID string,
) (*AuditAnchor, error) {
	anchor, err := c.readAnchorIfExists(ctx, anchorID)
	if err != nil {
		return nil, err
	}
	if anchor == nil {
		return nil, fmt.Errorf("anchor %s not found", anchorID)
	}
	return anchor, nil
}

func (c *AuditAnchorContract) FindAnchorByHash(
	ctx contractapi.TransactionContextInterface,
	canonicalHash string,
) (*AuditAnchor, error) {
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey(
		"canonicalHash~anchorId",
		[]string{canonicalHash},
	)
	if err != nil {
		return nil, fmt.Errorf("query hash index: %w", err)
	}
	defer iterator.Close()

	if !iterator.HasNext() {
		return nil, fmt.Errorf("anchor for hash %s not found", canonicalHash)
	}

	item, err := iterator.Next()
	if err != nil {
		return nil, fmt.Errorf("read hash index: %w", err)
	}

	_, parts, err := ctx.GetStub().SplitCompositeKey(item.Key)
	if err != nil {
		return nil, fmt.Errorf("split hash index: %w", err)
	}
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid hash index key")
	}

	return c.ReadAnchor(ctx, parts[1])
}

func (c *AuditAnchorContract) AnchorExists(
	ctx contractapi.TransactionContextInterface,
	anchorID string,
) (bool, error) {
	anchor, err := c.readAnchorIfExists(ctx, anchorID)
	return anchor != nil, err
}

func (c *AuditAnchorContract) readAnchorIfExists(
	ctx contractapi.TransactionContextInterface,
	anchorID string,
) (*AuditAnchor, error) {
	anchorBytes, err := ctx.GetStub().GetState(anchorStateKey(anchorID))
	if err != nil {
		return nil, fmt.Errorf("read anchor state: %w", err)
	}
	if len(anchorBytes) == 0 {
		return nil, nil
	}

	var anchor AuditAnchor
	if err := json.Unmarshal(anchorBytes, &anchor); err != nil {
		return nil, fmt.Errorf("unmarshal anchor: %w", err)
	}
	return &anchor, nil
}
