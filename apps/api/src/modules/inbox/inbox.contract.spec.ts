import {
  normalizeInboxText,
  normalizeRecipientRoleCode,
} from './inbox.contract';

describe('inbox contract', () => {
  it('normalizes bounded text', () => {
    expect(normalizeInboxText(' Permission request ', 'subject', 40)).toBe(
      'Permission request',
    );
  });

  it('rejects missing or oversized text', () => {
    expect(() => normalizeInboxText('', 'subject', 40)).toThrow(
      'subject is required',
    );
    expect(() => normalizeInboxText('x'.repeat(41), 'subject', 40)).toThrow(
      'subject must be 40 characters or fewer',
    );
  });

  it('normalizes role recipients', () => {
    expect(normalizeRecipientRoleCode(' org_admin ')).toBe('ORG_ADMIN');
    expect(normalizeRecipientRoleCode('')).toBeNull();
  });
});
