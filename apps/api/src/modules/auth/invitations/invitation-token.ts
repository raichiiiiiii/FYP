import { createHash, randomBytes } from 'node:crypto';
import { getAuthRuntimeConfig } from '../auth.config';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export type InvitationStatusInput = {
  status: string;
  expiresAt?: Date | string | null;
};

const invitationTokenBytes = 32;

export function createInvitationToken() {
  return randomBytes(invitationTokenBytes).toString('base64url');
}

export function hashInvitationToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error('Invitation token is required');
  }

  return createHash('sha256').update(normalizedToken, 'utf8').digest('hex');
}

export function calculateInvitationExpiry(
  now = new Date(),
  ttlSeconds = getAuthRuntimeConfig().inviteTokenTtlSeconds,
) {
  return new Date(now.getTime() + ttlSeconds * 1000);
}

export function resolveInvitationStatus(
  invitation: InvitationStatusInput,
  now = new Date(),
): InvitationStatus {
  const status = invitation.status as InvitationStatus;

  if (status !== 'pending') {
    return isInvitationStatus(status) ? status : 'pending';
  }

  if (!invitation.expiresAt) {
    return 'pending';
  }

  const expiresAt =
    invitation.expiresAt instanceof Date
      ? invitation.expiresAt
      : new Date(invitation.expiresAt);

  return expiresAt.getTime() <= now.getTime() ? 'expired' : 'pending';
}

export function canAcceptInvitation(invitation: InvitationStatusInput) {
  return resolveInvitationStatus(invitation) === 'pending';
}

function isInvitationStatus(value: string): value is InvitationStatus {
  return ['pending', 'accepted', 'revoked', 'expired'].includes(value);
}
