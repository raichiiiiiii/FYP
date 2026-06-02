import { BadRequestException } from '@nestjs/common';

export function requireText(value: string | undefined, field: string) {
  const text = value?.trim();

  if (!text) {
    throw new BadRequestException(`${field} is required`);
  }

  return text;
}

export function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text || undefined;
}

export function optionalPositiveInt(
  value: number | string | undefined,
  field: string,
) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException(`${field} must be a non-negative integer`);
  }

  return parsed;
}
