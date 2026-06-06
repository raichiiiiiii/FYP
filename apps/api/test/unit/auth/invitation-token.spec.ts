import {
  calculateInvitationExpiry,
  canAcceptInvitation,
  createInvitationToken,
  hashInvitationToken,
  resolveInvitationStatus,
} from '../../../src/modules/auth/invitations/invitation-token';

describe('invitation token helpers', () => {
  it('creates random URL-safe tokens', () => {
    const first = createInvitationToken();
    const second = createInvitationToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toBe(second);
  });

  it('hashes tokens deterministically without returning the raw token', () => {
    const token = 'invite-token-example';
    const hash = hashInvitationToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashInvitationToken(` ${token} `));
    expect(hash).not.toContain(token);
  });

  it('calculates expiry from the configured ttl', () => {
    const now = new Date('2026-06-06T00:00:00.000Z');

    expect(calculateInvitationExpiry(now, 3600).toISOString()).toBe(
      '2026-06-06T01:00:00.000Z',
    );
  });

  it('resolves pending invitations as expired after expiry', () => {
    const now = new Date('2026-06-06T00:00:00.000Z');

    expect(
      resolveInvitationStatus(
        {
          status: 'pending',
          expiresAt: '2026-06-05T23:59:59.000Z',
        },
        now,
      ),
    ).toBe('expired');
  });

  it('allows acceptance only while pending and not expired', () => {
    expect(
      canAcceptInvitation({
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).toBe(true);

    expect(canAcceptInvitation({ status: 'revoked' })).toBe(false);
    expect(canAcceptInvitation({ status: 'accepted' })).toBe(false);
  });
});
