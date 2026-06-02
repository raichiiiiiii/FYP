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

export function numericValue(
  value: number | string | undefined,
  field: string,
  fallback = 0,
) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new BadRequestException(`${field} must be a number`);
  }

  return amount;
}

export function positiveNumber(
  value: number | string | undefined,
  field: string,
  fallback?: number,
) {
  const amount = numericValue(value, field, fallback);

  if (amount <= 0) {
    throw new BadRequestException(`${field} must be greater than zero`);
  }

  return amount;
}
