import { BadRequestException } from '@nestjs/common';

const supportedProfileImagePattern =
  /^(https?:\/\/.+\.(png|jpe?g)(\?.*)?|\/.+\.(png|jpe?g)(\?.*)?|data:image\/(png|jpeg);base64,[a-z0-9+/=]+)$/i;

export function validateProfileImageUrl(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (!supportedProfileImagePattern.test(normalized)) {
    throw new BadRequestException(
      'profileImageUrl must reference a png or jpg image',
    );
  }

  return normalized;
}

export function validateDisplayName(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new BadRequestException('displayName is required');
  }

  if (normalized.length > 120) {
    throw new BadRequestException(
      'displayName must be 120 characters or fewer',
    );
  }

  return normalized;
}
