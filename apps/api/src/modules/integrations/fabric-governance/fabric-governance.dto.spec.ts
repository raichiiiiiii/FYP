import { BadRequestException } from '@nestjs/common';
import {
  assertSanitizedFabricGovernanceEvidence,
  normalizeEvidenceType,
  normalizeProposalType,
} from './fabric-governance.dto';

describe('Fabric governance DTO helpers', () => {
  it('normalizes supported proposal and evidence types', () => {
    expect(normalizeProposalType('CREATE_CHANNEL')).toBe('create_channel');
    expect(normalizeEvidenceType('GATEWAY_PROBE')).toBe('gateway_probe');
  });

  it('rejects unsupported proposal and evidence types', () => {
    expect(() => normalizeProposalType('direct_channel_create')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeEvidenceType('admin_private_key')).toThrow(
      BadRequestException,
    );
  });

  it('rejects secret-like evidence recursively', () => {
    expect(() =>
      assertSanitizedFabricGovernanceEvidence({
        summary: 'operator evidence',
        nested: {
          unsafe: '-----BEGIN PRIVATE KEY-----',
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('allows sanitized operator attestation metadata', () => {
    expect(() =>
      assertSanitizedFabricGovernanceEvidence({
        commandSummary:
          'Operator completed channel create and peer join outside MEPN.',
        contentHash:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sanitized: true,
      }),
    ).not.toThrow();
  });
});
