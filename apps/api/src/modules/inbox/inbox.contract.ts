import { BadRequestException } from '@nestjs/common';

export const inboxItemTypes = ['message', 'permission_request'] as const;
export type InboxItemType = (typeof inboxItemTypes)[number];

export const inboxStatuses = ['unread', 'read', 'closed'] as const;
export type InboxStatus = (typeof inboxStatuses)[number];

export function normalizeInboxText(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number,
) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new BadRequestException(`${fieldName} is required`);
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException(
      `${fieldName} must be ${maxLength} characters or fewer`,
    );
  }

  return normalized;
}

export function normalizeRecipientRoleCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  return normalized || null;
}
