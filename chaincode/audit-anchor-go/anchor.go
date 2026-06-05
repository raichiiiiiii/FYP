package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

const hashAlgorithm = "SHA-256"

var canonicalHashPattern = regexp.MustCompile(`^[a-fA-F0-9]{64}$`)

type AuditAnchor struct {
	AnchorID       string `json:"anchorId"`
	OrganizationID string `json:"organizationId,omitempty"`
	EntityType     string `json:"entityType"`
	EntityID       string `json:"entityId"`
	CanonicalHash  string `json:"canonicalHash"`
	HashAlgorithm  string `json:"hashAlgorithm"`
	Timestamp      string `json:"timestamp"`
	IdempotencyKey string `json:"idempotencyKey"`
	MetadataHash   string `json:"metadataHash,omitempty"`
}

type CreateAnchorInput struct {
	AnchorID       string
	OrganizationID string
	EntityType     string
	EntityID       string
	CanonicalHash  string
	Timestamp      string
	IdempotencyKey string
	MetadataJSON   string
}

func CalculateAnchorID(idempotencyKey string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(idempotencyKey)))
	return hex.EncodeToString(sum[:])
}

func NewAuditAnchor(input CreateAnchorInput) (*AuditAnchor, error) {
	normalized, err := normalizeCreateAnchorInput(input)
	if err != nil {
		return nil, err
	}

	expectedAnchorID := CalculateAnchorID(normalized.IdempotencyKey)
	if normalized.AnchorID != expectedAnchorID {
		return nil, fmt.Errorf("anchorId must equal sha256(idempotencyKey)")
	}

	metadataHash, err := metadataHash(normalized.MetadataJSON)
	if err != nil {
		return nil, err
	}

	return &AuditAnchor{
		AnchorID:       normalized.AnchorID,
		OrganizationID: normalized.OrganizationID,
		EntityType:     normalized.EntityType,
		EntityID:       normalized.EntityID,
		CanonicalHash:  strings.ToLower(normalized.CanonicalHash),
		HashAlgorithm:  hashAlgorithm,
		Timestamp:      normalized.Timestamp,
		IdempotencyKey: normalized.IdempotencyKey,
		MetadataHash:   metadataHash,
	}, nil
}

func ReconcileExistingAnchor(existing *AuditAnchor, input CreateAnchorInput) (*AuditAnchor, error) {
	if existing == nil {
		return NewAuditAnchor(input)
	}

	normalized, err := normalizeCreateAnchorInput(input)
	if err != nil {
		return nil, err
	}

	if existing.AnchorID == normalized.AnchorID &&
		existing.IdempotencyKey == normalized.IdempotencyKey &&
		existing.CanonicalHash == strings.ToLower(normalized.CanonicalHash) {
		return existing, nil
	}

	return nil, errors.New("anchor idempotency conflict")
}

func anchorStateKey(anchorID string) string {
	return "anchor:" + strings.TrimSpace(anchorID)
}

func normalizeCreateAnchorInput(input CreateAnchorInput) (CreateAnchorInput, error) {
	normalized := CreateAnchorInput{
		AnchorID:       strings.TrimSpace(input.AnchorID),
		OrganizationID: strings.TrimSpace(input.OrganizationID),
		EntityType:     strings.TrimSpace(input.EntityType),
		EntityID:       strings.TrimSpace(input.EntityID),
		CanonicalHash:  strings.TrimSpace(input.CanonicalHash),
		Timestamp:      strings.TrimSpace(input.Timestamp),
		IdempotencyKey: strings.TrimSpace(input.IdempotencyKey),
		MetadataJSON:   strings.TrimSpace(input.MetadataJSON),
	}

	required := map[string]string{
		"anchorId":       normalized.AnchorID,
		"entityType":     normalized.EntityType,
		"entityId":       normalized.EntityID,
		"canonicalHash":  normalized.CanonicalHash,
		"timestamp":      normalized.Timestamp,
		"idempotencyKey": normalized.IdempotencyKey,
	}

	for name, value := range required {
		if value == "" {
			return normalized, fmt.Errorf("%s is required", name)
		}
	}

	if !canonicalHashPattern.MatchString(normalized.CanonicalHash) {
		return normalized, errors.New("canonicalHash must be a SHA-256 hex digest")
	}

	return normalized, nil
}

func metadataHash(metadataJSON string) (string, error) {
	if strings.TrimSpace(metadataJSON) == "" {
		return "", nil
	}

	var decoded any
	if err := json.Unmarshal([]byte(metadataJSON), &decoded); err != nil {
		return "", fmt.Errorf("metadataJson must be valid JSON: %w", err)
	}

	sum := sha256.Sum256([]byte(metadataJSON))
	return hex.EncodeToString(sum[:]), nil
}
